import runpy
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE = runpy.run_path("scripts/install_deploy_host.py")


class InstallDeployHostTests(unittest.TestCase):
    def test_unsupported_host_stops_before_keys_or_environment_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "not-created"
            with patch("sys.argv", ["install_deploy_host.py", "--dev-branch", "feature/test", "--root", str(destination)]), \
                 patch.object(MODULE["subprocess"], "run", side_effect=[
                     subprocess.CompletedProcess([], 0, "", ""),
                     subprocess.CompletedProcess([], 0, "x86_64\n", ""),
                 ]) as run, \
                 self.assertRaises(SystemExit):
                MODULE["main"]()
            self.assertEqual(run.call_count, 2)
            self.assertFalse(destination.exists())


if __name__ == "__main__":
    unittest.main()
