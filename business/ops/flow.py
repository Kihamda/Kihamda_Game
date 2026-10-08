#!/usr/bin/env python3
"""Single-host, fenced business ledger. No deployment, network or scheduler."""
import argparse
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import tempfile
import time
import uuid


class Conflict(ValueError):
    pass


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(",", ":")).encode()).hexdigest()


def require(condition, message):
    if not condition:
        raise Conflict(message)


def artifact_list(items):
    require(isinstance(items, list) and len(items) > 0, "artifact evidence required")
    for item in items:
        require(isinstance(item, dict) and item.get("path") and
                len(item.get("sha256", "")) == 64, "path and sha256 required")
        require(all(c in "0123456789abcdef" for c in item["sha256"]), "invalid sha256")


def verify(state):
    require(state["schema"] == 1, "unsupported schema")
    previous = None
    for i, event in enumerate(state["events"], 1):
        body = {k: v for k, v in event.items() if k != "sha256"}
        require(event["revision"] == i and event["previous"] == previous and
                digest(body) == event["sha256"], "event chain damaged; reconcile, never reset")
        previous = event["sha256"]
    require(len(state["events"]) == state["revision"], "revision/event mismatch")
    require(sum(t["status"] == "running" for t in state["tasks"].values()) <= 1, "WIP exceeded")
    require(state["projection_sha256"] == digest({k: v for k, v in state.items()
                                                if k not in ("events", "projection_sha256")}),
            "projection damaged; restore from verified Git checkpoint")


def fresh():
    s = dict(schema=1, revision=0, business_id="game-site", fence=0, lease=None,
             tasks={}, decisions={}, runs={}, experiments={}, slots={}, feedback=[],
             approvals=[], external={}, observations=[], events=[])
    s["projection_sha256"] = digest({k: v for k, v in s.items() if k != "events"})
    return s


class Ledger:
    def __init__(self, path, clock=time.time):
        self.path = Path(path)
        self.clock = clock
        self.root = (self.path.parents[2] if self.path.parent.name == "ops" and
                     self.path.parent.parent.name == "business" else self.path.parent).resolve()

    def verify_artifacts(self, items):
        artifact_list(items)
        for item in items:
            rel = Path(item["path"])
            require(not rel.is_absolute() and not any(p.startswith(".") or p == ".." for p in rel.parts),
                    "repository-relative non-secret artifact path required")
            file = (self.root / rel).resolve()
            require(file.is_relative_to(self.root) and file.is_file(), "artifact missing/outside workspace")
            require(hashlib.sha256(file.read_bytes()).hexdigest() == item["sha256"],
                    "artifact changed; check again, never complete stale acceptance")

    def read(self):
        with self.path.open() as f:
            state = json.load(f)
        verify(state)
        return state

    def transact(self, expected, action, data):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # A stable separate inode; never lock the atomically replaced ledger file.
        with self.path.with_suffix(".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            s = self.read() if self.path.exists() else fresh()
            require(s["revision"] == expected, "revision conflict; reread before retry")
            require(action == "init" or self.path.exists(), "init required")
            s = copy.deepcopy(s)
            now = self.clock()
            result = self.apply(s, action, data, now)
            s["revision"] += 1
            event = dict(revision=s["revision"], at=now, action=action, data=data,
                         result=result, previous=s["events"][-1]["sha256"] if s["events"] else None)
            event["sha256"] = digest(event)
            s["events"].append(event)
            s["projection_sha256"] = digest({k: v for k, v in s.items()
                                             if k not in ("events", "projection_sha256")})
            verify(s)
            # One atomic commit contains projection AND append-only history.
            fd, name = tempfile.mkstemp(prefix=".ledger-", dir=self.path.parent)
            try:
                with os.fdopen(fd, "w") as f:
                    json.dump(s, f, ensure_ascii=False, indent=2)
                    f.write("\n")
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(name, self.path)
                parent = os.open(self.path.parent, os.O_DIRECTORY)
                try:
                    os.fsync(parent)
                finally:
                    os.close(parent)
            finally:
                if os.path.exists(name):
                    os.unlink(name)
            return dict(revision=s["revision"], result=result)

    def worker(self, s, data, now):
        lease = s["lease"]
        require(lease is not None and lease["run_id"] == data.get("run_id") and
                lease["fence"] == data.get("fence") and now < lease["expires_at"],
                "stale/expired worker; reconcile before recovery")
        return s["tasks"][lease["task_id"]], lease

    def publish(self, s, d, now):
        task, lease = self.worker(s, d, now)
        require(d.get("name") and Path(d["name"]).name == d["name"], "one staged filename required")
        stage = self.path.parent / ".runtime" / str(lease["fence"])
        source = stage / d["name"]
        require(source.is_file() and not source.is_symlink(), "staged regular file required")
        body = source.read_bytes()
        sha = hashlib.sha256(body).hexdigest()
        require(sha == d.get("sha256"), "staged artifact hash mismatch")
        directory = self.path.parent / "artifacts"
        directory.mkdir(exist_ok=True)
        dest = directory / sha
        if dest.exists():
            require(hashlib.sha256(dest.read_bytes()).hexdigest() == sha, "immutable artifact damaged")
        else:
            # Publication is content-addressed: no older worker can overwrite a new result.
            with dest.open("xb") as f:
                f.write(body)
                f.flush()
                os.fsync(f.fileno())
            dest.chmod(0o444)
        result = dict(path=str(dest.relative_to(self.path.parent)), sha256=sha, name=d["name"])
        task["checkpoints"].append(dict(kind="artifact", at=now, run_id=lease["run_id"],
                                         fence=lease["fence"], artifact=result))
        return result

    def apply(self, s, action, d, now):
        if action == "init":
            require(s["revision"] == 0, "already initialized")
            return {"initialized": True}
        if action == "decision":
            require(d.get("id") and d.get("source") and d.get("hypothesis") and d.get("next_step"),
                    "decision id/source/hypothesis/next_step required")
            require(d["id"] not in s["decisions"], "decision immutable; add superseding decision")
            s["decisions"][d["id"]] = d
        elif action == "experiment":
            for key in ("id", "hypothesis", "game_id", "primary_metric", "quality_acceptance",
                        "measurement_plan", "decision_id", "next_step", "source"):
                require(d.get(key), "experiment requires " + key)
            require(d["decision_id"] in s["decisions"], "unknown decision")
            require(d["id"] not in s["experiments"], "reuse existing experiment, never reset per run")
            s["experiments"][d["id"]] = dict(d, stage="plan", history=[], release=None)
        elif action == "experiment-stage":
            exp = s["experiments"][d["id"]]
            stages = {"plan": "do", "do": "check", "check": "act", "act": "plan"}
            require(d.get("stage") == stages[exp["stage"]], "PDCA stages must advance in order")
            require(d.get("source") and d.get("evidence") and d.get("next_step"), "PDCA evidence required")
            if exp["stage"] == "check":
                require(d.get("judgment") in ("continue", "improve", "stop", "unobserved"),
                        "check -> act needs supported judgment, not an invented result")
            exp["history"].append(dict(d, at=now, previous_stage=exp["stage"]))
            exp.update(stage=d["stage"], next_step=d["next_step"])
        elif action == "feedback":
            require(d.get("source", "").startswith("user:") and d.get("message") and
                    d.get("next_step"), "user feedback and actionable next step required")
            s["feedback"].append(dict(d, at=now))
        elif action == "task":
            for key in ("id", "objective", "acceptance", "outputs", "checks", "next_step",
                        "decision_id", "hypothesis", "source"):
                require(d.get(key), "task requires " + key)
            require(d["id"] not in s["tasks"], "duplicate task")
            require(d["decision_id"] in s["decisions"], "unknown decision")
            require(d.get("pdca") in ("plan", "do", "check", "act"), "task needs PDCA phase")
            require(d.get("experiment_id") in s["experiments"], "task needs persistent experiment")
            require(all(dep in s["tasks"] for dep in d.get("depends_on", [])), "unknown dependency")
            require(d.get("action", "internal") == "internal", "external work uses prepare-external")
            s["tasks"][d["id"]] = dict(d, status="ready", checkpoints=[], claims=[])
        elif action == "start":
            require(d.get("run_id") and d.get("source"), "manual/scheduled source required")
            require(d["run_id"] not in s["runs"], "duplicate run_id")
            s["runs"][d["run_id"]] = dict(d, status="open", started_at=now)
        elif action == "slot":
            from datetime import datetime
            from zoneinfo import ZoneInfo
            scheduled = datetime.fromisoformat(d["scheduled_at"])
            require(scheduled.tzinfo is not None, "scheduled_at requires timezone")
            local = scheduled.astimezone(ZoneInfo("Asia/Tokyo"))
            require(local.hour in (1, 7, 13, 19) and local.minute == 0 and local.second == 0,
                    "only matching BOOTH game slots")
            require(0 <= now - scheduled.timestamp() < 1800, "slot expired/future; no blind catch-up")
            key = local.isoformat()
            require(key not in s["slots"], "slot already consumed; resume existing run, do not rerun")
            require(d.get("run_id") and d["run_id"] not in s["runs"], "unique run_id required")
            s["slots"][key] = d["run_id"]
            s["runs"][d["run_id"]] = dict(d, source="scheduled:game-site:" + key,
                                         status="open", started_at=now)
        elif action == "claim":
            require(s["lease"] is None, "WIP1: active OR expired lease requires reconciliation")
            require(d["run_id"] in s["runs"] and s["runs"][d["run_id"]]["status"] == "open",
                    "run not open")
            t = s["tasks"][d["task_id"]]
            require(t["status"] == "ready", "task not ready")
            require(all(s["tasks"][dep]["status"] == "done" for dep in t.get("depends_on", [])),
                    "dependencies unfinished")
            ttl = d.get("ttl_seconds", 1800)
            require(isinstance(ttl, int) and 0 < ttl <= 1800, "lease max 30 minutes")
            s["fence"] += 1
            s["lease"] = dict(run_id=d["run_id"], task_id=d["task_id"],
                              fence=s["fence"], expires_at=now + ttl)
            t["status"] = "running"
            t["claims"].append(copy.deepcopy(s["lease"]))
            return s["lease"]
        elif action in ("block", "cancel", "unblock"):
            t = s["tasks"][d["task_id"]]
            require(t["status"] != "running", "running task requires worker checkpoint/recovery")
            require(d.get("source") and d.get("reason") and d.get("next_step"), "transition evidence required")
            require(t["status"] != "done", "completed history immutable; create follow-up")
            require(action != "unblock" or t["status"] == "blocked", "only blocked task resumes")
            require(t["status"] != "cancelled", "cancelled history immutable")
            t["checkpoints"].append(dict(d, at=now))
            t["status"] = {"block": "blocked", "cancel": "cancelled", "unblock": "ready"}[action]
        elif action in ("checkpoint", "complete"):
            t, lease = self.worker(s, d, now)
            self.verify_artifacts(d.get("artifacts"))
            require(d.get("checks") and d.get("next_step"), "checks/next_step required")
            t["checkpoints"].append(dict(d, at=now))
            if action == "complete":
                require(d.get("passed") is True, "completion requires passing acceptance checks")
                t["status"] = "done"
                s["runs"][lease["run_id"]]["status"] = "completed"
                s["lease"] = None
        elif action == "publish":
            return self.publish(s, d, now)
        elif action == "recover":
            lease = s["lease"]
            require(lease is not None and now >= lease["expires_at"], "only expired lease recoverable")
            require(d.get("source") and d.get("reconciliation") and d.get("next_step"),
                    "recovery requires reviewed artifacts and external-result reconciliation")
            self.verify_artifacts(d.get("artifacts"))
            require(not any(x["status"] == "unknown" for x in s["external"].values()),
                    "unknown external result: reconcile it first, never blindly retry")
            t = s["tasks"][lease["task_id"]]
            t["checkpoints"].append(dict(d, at=now, recovered_fence=lease["fence"]))
            t["status"] = "ready"
            s["runs"][lease["run_id"]]["status"] = "recovered"
            s["lease"] = None
        elif action == "approval":
            require(d.get("source", "").startswith("user:") and d.get("quote") and
                    d.get("action") and d.get("artifact_sha256") and
                    d.get("status") in ("pending", "approved", "rejected"), "explicit user evidence required")
            require(len(d["artifact_sha256"]) == 64, "approval must bind an exact artifact digest")
            # This records a human's statement; the CLI does not authenticate it or execute actions.
            s["approvals"].append(d)
        elif action == "prepare-external":
            if s["lease"] is not None:
                self.worker(s, d, now)
            require(d.get("id") not in s["external"] and d.get("id") and d.get("action") and
                    d.get("artifact_sha256"), "unique operation id/action/version required")
            approvals = [a for a in s["approvals"] if a["action"] == d["action"] and
                         a["artifact_sha256"] == d["artifact_sha256"]]
            require(approvals and approvals[-1]["status"] == "approved",
                    "version-specific explicit approval absent")
            s["external"][d["id"]] = dict(d, status="unknown")
            # Prepared does NOT imply submitted; after a crash the result must be reconciled.
        elif action == "reconcile-external":
            op = s["external"][d["id"]]
            require(op["status"] == "unknown" and d.get("source") and d.get("evidence") and
                    d.get("status") in ("confirmed_success", "confirmed_not_applied", "failed"),
                    "external result needs authoritative evidence")
            op.update(status=d["status"], reconciliation=d)
        elif action == "observe":
            for key in ("metric", "period", "definition", "source", "population", "timezone"):
                require(d.get(key), "observation requires " + key)
            require(d.get("measured") is True and d.get("value") is not None,
                    "unobserved stays null; synthetic tests are not observations")
            from datetime import datetime
            period = d["period"]
            start = datetime.fromisoformat(period["start"])
            end = datetime.fromisoformat(period["end"])
            require(start.tzinfo and end.tzinfo and start < end and end.timestamp() <= now,
                    "completed aware period required")
            from zoneinfo import ZoneInfo
            ZoneInfo(d["timezone"])
            require(d["metric"] != "monthly_net_profit_jpy" or
                    (d.get("all_costs_reconciled") is True and d.get("revenue_source") and
                     d.get("cost_source") and d.get("complete_calendar_month") is True and
                     d.get("revenue_period") == period and d.get("cost_period") == period),
                    "net profit requires same-month complete revenue/all-cost ledger")
            if d["metric"] == "monthly_net_profit_jpy":
                zone = ZoneInfo(d["timezone"])
                a, b = start.astimezone(zone), end.astimezone(zone)
                month = a.month % 12 + 1
                year = a.year + (a.month == 12)
                require(a.day == 1 and a.hour == a.minute == a.second == a.microsecond == 0 and
                        (b.year, b.month, b.day, b.hour, b.minute, b.second, b.microsecond) ==
                        (year, month, 1, 0, 0, 0, 0), "profit period must be exactly a calendar month")
            s["observations"].append(d)
        else:
            raise Conflict("unsupported action")
        return {"recorded": action}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["status", "next", "init", "decision", "task", "start", "claim",
                        "checkpoint", "complete", "recover", "approval", "prepare-external",
                        "reconcile-external", "observe", "experiment", "experiment-stage",
                        "feedback", "slot", "block", "cancel", "unblock", "publish"])
    parser.add_argument("--ledger", default=str(Path(__file__).with_name("ledger.json")))
    parser.add_argument("--expected", type=int)
    parser.add_argument("--data", help="JSON file; no credentials/PII")
    args = parser.parse_args()
    ledger = Ledger(args.ledger)
    try:
        if args.action == "next":
            s = ledger.read()
            ready = [t for t in s["tasks"].values() if t["status"] == "ready" and
                     all(s["tasks"][dep]["status"] == "done" for dep in t.get("depends_on", []))]
            ready.sort(key=lambda t: (t.get("priority", 100), t["id"]))
            result = dict(revision=s["revision"], lease=s["lease"],
                          next_task=ready[0] if ready and s["lease"] is None else None)
        elif args.action == "status":
            s = ledger.read()
            result = {k: s[k] for k in ("revision", "lease", "tasks", "approvals", "external")}
        else:
            require(args.expected is not None, "--expected revision required")
            data = json.loads(Path(args.data).read_text()) if args.data else {}
            result = ledger.transact(args.expected, args.action, data)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (Conflict, KeyError, ValueError) as exc:
        parser.exit(2, str(exc) + "\n")


if __name__ == "__main__":
    main()
