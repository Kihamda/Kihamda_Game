import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

FLOW = Path(__file__).resolve().parents[1] / "ops/flow.py"
spec = importlib.util.spec_from_file_location("flow", FLOW)
flow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(flow)
import hashlib
ART = [{"path": "evidence/review.json", "sha256": hashlib.sha256(b"reviewed").hexdigest()}]


class FlowTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.now = 1000
        self.path = Path(self.tmp.name) / "ledger.json"
        (self.path.parent / "evidence").mkdir()
        (self.path.parent / "evidence/review.json").write_bytes(b"reviewed")
        self.ledger = flow.Ledger(self.path, lambda: self.now)
        self.rev = 0
        self.send("init")
        self.send("decision", id="D", source="user:test", hypothesis="quality enables play",
                  next_step="inspect")
        self.send("experiment", id="E", hypothesis="quality enables play", game_id="2048",
                  primary_metric="start_rate", quality_acceptance=["playable"], measurement_plan="matched 14d",
                  decision_id="D", next_step="inspect", source="user:test")
        self.task("T")
        self.send("start", run_id="R", source="user:test")

    def tearDown(self):
        self.tmp.cleanup()

    def send(self, operation, **data):
        result = self.ledger.transact(self.rev, operation, data)
        self.rev = result["revision"]
        return result["result"]

    def task(self, tid):
        self.send("task", id=tid, objective="fix", acceptance=["pass"], outputs=["patch"],
                  checks=["browser"], next_step="measure", decision_id="D", hypothesis="play",
                  source="user:test", pdca="do", experiment_id="E")

    def claim(self):
        return self.send("claim", run_id="R", task_id="T", ttl_seconds=10)

    def evidence(self, lease):
        return dict(run_id=lease["run_id"], fence=lease["fence"], artifacts=ART,
                    checks=["verified"], next_step="review")

    def test_revision_compare_and_swap(self):
        with self.assertRaises(flow.Conflict):
            self.ledger.transact(self.rev - 1, "start", {"run_id": "X", "source": "user:test"})

    def test_wip_and_expired_lease_not_reclaimed(self):
        self.claim()
        self.now += 11
        with self.assertRaises(flow.Conflict):
            self.send("claim", run_id="R", task_id="T")

    def test_stale_worker_after_recovery(self):
        old = self.claim()
        self.now += 11
        self.send("recover", source="review:test", reconciliation="no external submission; artifact inspected",
                  artifacts=ART, next_step="continue remaining checks")
        self.send("start", run_id="R2", source="user:test")
        new = self.send("claim", run_id="R2", task_id="T")
        self.assertGreater(new["fence"], old["fence"])
        with self.assertRaises(flow.Conflict):
            self.send("checkpoint", **self.evidence(old))
        self.send("checkpoint", **self.evidence(new))

    def test_expired_worker_cannot_complete(self):
        lease = self.claim()
        self.now += 10
        with self.assertRaises(flow.Conflict):
            self.send("complete", passed=True, **self.evidence(lease))

    def test_recovery_cannot_overwrite_live_worker(self):
        self.claim()
        with self.assertRaises(flow.Conflict):
            self.send("recover", source="review:test", reconciliation="checked", artifacts=ART, next_step="resume")

    def test_duplicate_task_and_run_rejected(self):
        with self.assertRaises(flow.Conflict):
            self.task("T")
        with self.assertRaises(flow.Conflict):
            self.send("start", run_id="R", source="user:test")

    def test_task_required_fields(self):
        with self.assertRaises(flow.Conflict):
            self.send("task", id="bad", objective="fix")

    def test_checkpoint_and_unfinished_history_preserved(self):
        self.task("T2")
        lease = self.claim()
        old_events = copy.deepcopy(self.ledger.read()["events"])
        self.send("checkpoint", **self.evidence(lease))
        self.send("complete", passed=True, **self.evidence(lease))
        s = self.ledger.read()
        self.assertEqual(s["events"][:len(old_events)], old_events)
        self.assertEqual(s["tasks"]["T2"]["status"], "ready")
        with self.assertRaises(flow.Conflict):
            self.send("claim", run_id="R", task_id="T")

    def test_unknown_external_result_no_blind_retry(self):
        self.send("approval", source="user:test", quote="approve exact version", action="deploy",
                  artifact_sha256="a" * 64, status="approved")
        self.send("prepare-external", id="OP", action="deploy", artifact_sha256="a" * 64)
        self.claim()
        self.now += 11
        with self.assertRaises(flow.Conflict):
            self.send("recover", source="review:test", reconciliation="unknown", artifacts=ART, next_step="retry")
        with self.assertRaises(flow.Conflict):
            self.send("prepare-external", id="OP", action="deploy", artifact_sha256="a" * 64)
        self.send("reconcile-external", id="OP", source="hosting:read", evidence="version absent",
                  status="confirmed_not_applied")
        self.send("recover", source="review:test", reconciliation="OP confirmed not applied",
                  artifacts=ART, next_step="new reviewed attempt")

    def test_external_requires_exact_approval(self):
        with self.assertRaises(flow.Conflict):
            self.send("prepare-external", id="OP", action="deploy", artifact_sha256="a" * 64)

    def test_revoked_approval_cannot_be_reused(self):
        for status in ("approved", "rejected"):
            self.send("approval", source="user:test", quote="exact version " + status,
                      action="deploy", artifact_sha256="a" * 64, status=status)
        with self.assertRaises(flow.Conflict):
            self.send("prepare-external", id="OP", action="deploy", artifact_sha256="a" * 64)

    def test_synthetic_observation_rejected(self):
        with self.assertRaises(flow.Conflict):
            self.send("observe", metric="visitors", period={"start": "x", "end": "y"},
                      definition="users", source="QA", population="test", timezone="UTC",
                      value=10, measured=False)

    def test_profit_requires_full_costs(self):
        with self.assertRaises(flow.Conflict):
            self.send("observe", metric="monthly_net_profit_jpy",
                      period={"start": "1970-01-01T00:00:00+00:00", "end": "1970-01-01T00:01:00+00:00"},
                      definition="revenue less all costs", source="ledger", population="site",
                      timezone="UTC", value=100, measured=True)

    def test_tampered_event_and_projection_fail_closed(self):
        original = self.path.read_text()
        for field in ("events", "tasks"):
            s = json.loads(original)
            if field == "events":
                s["events"][0]["action"] = "changed"
            else:
                s["tasks"]["T"]["status"] = "done"
            self.path.write_text(json.dumps(s))
            with self.assertRaises(flow.Conflict):
                self.ledger.read()
        self.path.write_text(original)

    def test_failed_write_preserves_ledger(self):
        before = self.path.read_bytes()
        with self.assertRaises(flow.Conflict):
            self.send("unsupported")
        self.assertEqual(self.path.read_bytes(), before)

    def test_two_process_cas_only_one_winner(self):
        data = Path(self.tmp.name) / "start.json"
        data.write_text(json.dumps({"run_id": "race", "source": "user:race"}))
        cmd = [sys.executable, str(FLOW), "start", "--ledger", str(self.path),
               "--expected", str(self.rev), "--data", str(data)]
        workers = [subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(2)]
        codes = [p.communicate() and p.returncode for p in workers]
        self.assertEqual(sorted(codes), [0, 2])
        self.assertEqual(self.ledger.read()["revision"], self.rev + 1)

    def test_pdca_order_and_judgment(self):
        with self.assertRaises(flow.Conflict):
            self.send("experiment-stage", id="E", stage="act", evidence="none",
                      source="test", next_step="continue")
        for stage in ("do", "check"):
            self.send("experiment-stage", id="E", stage=stage, evidence="QA only",
                      source="test", next_step="continue")
        with self.assertRaises(flow.Conflict):
            self.send("experiment-stage", id="E", stage="act", evidence="QA only",
                      source="test", next_step="continue")
        self.send("experiment-stage", id="E", stage="act", evidence="no traffic data",
                  source="test", next_step="measure later", judgment="unobserved")

    def test_dependency_and_blocked_wait_do_not_drop_work(self):
        self.send("task", id="dependent", objective="fix", acceptance=["pass"], outputs=["patch"],
                  checks=["browser"], next_step="measure", decision_id="D", hypothesis="play",
                  source="user:test", pdca="do", experiment_id="E", depends_on=["T"])
        with self.assertRaises(flow.Conflict):
            self.send("claim", run_id="R", task_id="dependent")
        self.send("block", task_id="dependent", source="test", reason="waiting for approval",
                  next_step="review version")
        self.claim()
        self.assertEqual(self.ledger.read()["tasks"]["dependent"]["status"], "blocked")

    def test_slot_deduplication_and_expiration(self):
        from datetime import datetime
        self.now = datetime.fromisoformat("2026-10-08T22:00:00+00:00").timestamp()
        self.send("slot", scheduled_at="2026-10-09T07:00:00+09:00", run_id="S")
        with self.assertRaises(flow.Conflict):
            self.send("slot", scheduled_at="2026-10-09T07:00:00+09:00", run_id="S2")
        self.now += 1800
        with self.assertRaises(flow.Conflict):
            self.send("slot", scheduled_at="2026-10-09T07:00:00+09:00", run_id="S3")

    def test_fenced_artifact_publication_rejects_old_worker(self):
        import hashlib
        lease = self.claim()
        stage = self.path.parent / ".runtime" / str(lease["fence"])
        stage.mkdir(parents=True)
        (stage / "review.txt").write_text("reviewed")
        sha = hashlib.sha256(b"reviewed").hexdigest()
        result = self.send("publish", run_id="R", fence=lease["fence"], name="review.txt", sha256=sha)
        self.assertEqual((self.path.parent / result["path"]).read_text(), "reviewed")

        self.now += 10
        (stage / "review.txt").write_text("stale worker edit")
        with self.assertRaises(flow.Conflict):
            self.send("publish", run_id="R", fence=lease["fence"], name="review.txt",
                      sha256=hashlib.sha256(b"stale worker edit").hexdigest())
        self.assertEqual((self.path.parent / result["path"]).read_text(), "reviewed")

    def test_changed_evidence_cannot_complete(self):
        lease = self.claim()
        (self.path.parent / "evidence/review.json").write_bytes(b"changed")
        with self.assertRaises(flow.Conflict):
            self.send("complete", passed=True, **self.evidence(lease))

    def test_cli_unicode_output_with_ascii_environment(self):
        self.task("移行検査")
        env = dict(os.environ, PYTHONIOENCODING="ascii", PYTHONUTF8="0")
        result = subprocess.run([sys.executable, str(FLOW), "status", "--ledger", str(self.path)],
                                capture_output=True, env=env)
        self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8"))
        output = json.loads(result.stdout.decode("utf-8"))
        self.assertEqual(output["revision"], self.rev)
        self.assertIn("移行検査", output["tasks"])


if __name__ == "__main__":
    unittest.main()
