import json
import subprocess
import runpy
import unittest
from unittest.mock import patch
from pathlib import Path


MODULE = runpy.run_path("scripts/select_dev_branch.py")


class SelectDevBranchTests(unittest.TestCase):
    def test_rejects_main_before_gh_mutation(self):
        with self.assertRaises(ValueError), patch.object(MODULE["subprocess"], "run") as run:
            MODULE["select"]("main")
        run.assert_not_called()

    @patch.object(MODULE["subprocess"], "run")
    def test_validates_branch_pr_then_rotates_policy_and_dispatches(self, run):
        responses = [
            "matthew-ngzc/fruit-box\n", "main\n",
            '[{"path": ".github/workflows/deploy.yml"}]', "{}",
            '[{"number": 12, "headRepository": {"nameWithOwner": "matthew-ngzc/fruit-box"}}]',
            json.dumps({"branch_policies": [{"id": 2, "name": "old"}]}),
            json.dumps({"id": 3}), "", "", "",
        ]
        run.side_effect = [type("Result", (), {"stdout": value}) for value in responses]

        MODULE["select"]("feature/ci")

        commands = [call.args[0] for call in run.call_args_list]
        self.assertEqual(commands[0][:3], ["gh", "repo", "view"])
        self.assertIn("contents/.github/workflows/deploy.yml?ref=main", commands[2][-1])
        self.assertIn("branches/feature%2Fci", commands[3][-1])
        self.assertEqual(commands[-1][:4], ["gh", "workflow", "run", "deploy.yml"])
        self.assertIn("--body", commands[-2])

    @patch.object(MODULE["subprocess"], "run")
    def test_reports_default_branch_bootstrap_requirement(self, run):
        run.side_effect = [
            type("Result", (), {"stdout": "matthew-ngzc/fruit-box\n"}),
            type("Result", (), {"stdout": "main\n"}),
            subprocess.CalledProcessError(1, ["gh", "api"], stderr="HTTP 404"),
        ]
        with self.assertRaisesRegex(ValueError, "bootstrap"):
            MODULE["select"]("feature/ci")


if __name__ == "__main__":
    unittest.main()
