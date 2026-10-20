import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

OPS = Path(__file__).resolve().parents[1] / "ops"
spec = importlib.util.spec_from_file_location("context_flow", OPS / "flow.py")
flow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(flow)
# context.py uses the adjacent production flow module, including its verifier.
sys.path.insert(0, str(OPS))
spec = importlib.util.spec_from_file_location("startup_context", OPS / "context.py")
context = importlib.util.module_from_spec(spec)
spec.loader.exec_module(context)


class ContextTest(unittest.TestCase):
    def setUp(self):
        self.state = dict(
            revision=42, lease=None,
            tasks={
                "old": dict(id="old", status="done", decision_id="obsolete",
                            objective="HISTORICAL_TASK", checkpoints=[{"next_step": "OLD_STEP"}]),
                "current": dict(id="current", status="ready", decision_id="current-decision",
                                objective="ship verified update", checkpoints=[
                                    {"next_step": "SUPERSEDED_CHECKPOINT"},
                                    {"next_step": "verify target path"}]),
                "cancelled": dict(id="cancelled", status="cancelled",
                                  objective="CANCELLED_TASK"),
            },
            decisions={"obsolete": {"hypothesis": "OBSOLETE_DECISION"},
                       "current-decision": {"hypothesis": "CURRENT_DECISION"}},
            events=[dict(revision=40, action="checkpoint", data=dict(
                run_id="previous", next_step="verify target path",
                checks=["LONG_PAST_CHECKS"], artifacts=[{"path": "docs/evidence.json"}]))],
            external={"op": {"status": "unknown", "id": "op"},
                      "finished": {"status": "confirmed_success", "id": "OLD_EXTERNAL"}},
            feedback=[{"message": "OLD_FEEDBACK"}, {"message": "CURRENT_FEEDBACK"}])

    def test_startup_excludes_completed_cancelled_and_unrelated_history(self):
        output = json.dumps(context.select_context(self.state))
        for excluded in ("HISTORICAL_TASK", "CANCELLED_TASK", "OBSOLETE_DECISION",
                         "OLD_EXTERNAL", "OLD_FEEDBACK", "LONG_PAST_CHECKS",
                         "SUPERSEDED_CHECKPOINT", "CURRENT_DECISION"):
            self.assertNotIn(excluded, output)
        self.assertIn("CURRENT_FEEDBACK", output)
        self.assertIn("verify target path", output)
        self.assertIn('"id": "op"', output)

    def test_selected_task_loads_its_decision_and_latest_checkpoint_only(self):
        selected = context.select_context(self.state, "current")
        self.assertEqual(selected["decision"], self.state["decisions"]["current-decision"])
        self.assertEqual(selected["task"]["latest_checkpoint"], [{"next_step": "verify target path"}])
        self.assertNotIn("OBSOLETE_DECISION", json.dumps(selected))

    def test_completed_history_is_available_only_on_explicit_selection(self):
        selected = context.select_context(self.state, "old")
        self.assertEqual(selected["task"]["status"], "done")
        self.assertEqual(selected["decision"], self.state["decisions"]["obsolete"])
        with self.assertRaises(ValueError):
            context.select_context(self.state, "missing")

    def test_read_view_preserves_source_and_active_lease(self):
        self.state["lease"] = {"run_id": "other-worker", "fence": 9}
        original = copy.deepcopy(self.state)
        self.assertEqual(context.select_context(self.state)["lease"], original["lease"])
        self.assertEqual(self.state, original)

    def test_no_unfinished_tasks_does_not_resurrect_old_task(self):
        self.state["tasks"]["current"]["status"] = "done"
        self.assertEqual(context.select_context(self.state)["unfinished_tasks"], [])

    def test_migrated_history_retains_original_checkpoint_bytes(self):
        root = OPS.parents[1]
        manifest = json.loads((root / "docs/history/context-migration-20261020.json").read_text("utf-8"))
        for item in manifest.values():
            with self.subTest(archive=item["archive"]):
                self.assertEqual(hashlib.sha256((root / item["archive"]).read_bytes()).hexdigest(),
                                 item["sha256"])

    def test_cli_checks_integrity_without_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ledger.json"
            ledger = flow.Ledger(path)
            ledger.transact(0, "init", {})
            original = path.read_bytes()
            command = [sys.executable, str(OPS / "context.py"), "--ledger", str(path)]
            result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)["revision"], 1)
            self.assertEqual(path.read_bytes(), original)
            for corrupt_events in (True, False):
                state = json.loads(original)
                if corrupt_events:
                    state["events"][0]["data"] = {"tampered": True}
                else:
                    state["lease"] = {"run_id": "tampered"}
                path.write_text(json.dumps(state), encoding="utf-8")
                corrupt_bytes = path.read_bytes()
                result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertIn("damaged", result.stderr)
                self.assertEqual(path.read_bytes(), corrupt_bytes)


if __name__ == "__main__":
    unittest.main()
