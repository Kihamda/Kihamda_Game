#!/usr/bin/env python3
"""Read-only, verified views of the canonical ledger for selective context loading."""
import argparse
import json
from pathlib import Path
import sys

from flow import Conflict, Ledger


def task_summary(task):
    keys = ("id", "status", "objective", "acceptance", "outputs", "checks",
            "depends_on", "decision_id", "experiment_id", "next_step", "source")
    result = {key: task[key] for key in keys if key in task}
    result["latest_checkpoint"] = task.get("checkpoints", [])[-1:]
    return result


def select_context(state, task_id=None):
    """Do not expose completed task histories or unrelated decisions at startup."""
    if task_id:
        if task_id not in state["tasks"]:
            raise Conflict("unknown task; search canonical task IDs before selecting")
        task = state["tasks"][task_id]
        return dict(revision=state["revision"], lease=state["lease"],
                    task=task_summary(task),
                    decision=state["decisions"].get(task.get("decision_id")))
    active = [task_summary(task) for task in state["tasks"].values()
              if task["status"] not in ("done", "cancelled")]
    checkpoint = next((event for event in reversed(state["events"])
                       if event["action"] == "checkpoint"), None)
    # Keep only the locator and next step. Detailed evidence is loaded on demand.
    latest = None if checkpoint is None else dict(
        revision=checkpoint["revision"],
        run_id=checkpoint["data"].get("run_id"),
        next_step=checkpoint["data"].get("next_step"),
        artifacts=checkpoint["data"].get("artifacts", []))
    return dict(revision=state["revision"], lease=state["lease"],
                unfinished_tasks=active, latest_checkpoint=latest,
                unknown_external=[op for op in state["external"].values()
                                  if op["status"] == "unknown"],
                latest_feedback=state.get("feedback", [])[-1:])


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, default=
                        Path(__file__).resolve().parents[1] / "unity/ops/ledger.json")
    parser.add_argument("--task", help="Read just this canonical task and its decision")
    args = parser.parse_args()
    try:
        # Ledger.read verifies both the event chain and projection before selection.
        state = Ledger(args.ledger).read()
        print(json.dumps(select_context(state, args.task), ensure_ascii=False, indent=2))
    except (Conflict, KeyError, ValueError, OSError) as exc:
        parser.exit(2, str(exc) + "\n")


if __name__ == "__main__":
    main()
