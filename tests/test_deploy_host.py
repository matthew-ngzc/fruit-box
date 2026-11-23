import importlib.util
import json
from pathlib import Path
import subprocess
from io import StringIO
import tempfile
import unittest
from unittest.mock import patch

MODULE_PATH = Path(__file__).parents[1] / "scripts" / "deploy_host.py"
spec = importlib.util.spec_from_file_location("deploy_host", MODULE_PATH)
deploy_host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy_host)

IMAGE = "ghcr.io/matthew-ngzc/fruit-box@sha256:" + "a" * 64
COMMIT = "b" * 40


class FakeRunner:
    def __init__(self, legacy=False, smoke_fail=False):
        self.calls = []
        self.legacy = legacy
        self.smoke_fail = smoke_fail

    def __call__(self, argv, **kwargs):
        self.calls.append((argv, kwargs))
        if argv[:2] == ["docker", "ps"]:
            output = "legacy-id\n" if self.legacy else ""
            return subprocess.CompletedProcess(argv, 0, output, "")
        if "exec" in argv and self.smoke_fail:
            self.smoke_fail = False
            return subprocess.CompletedProcess(argv, 1, "", "smoke failure")
        if argv[:3] == ["docker", "image", "inspect"]:
            image = argv[3]
            revision = "d" * 40 if "c" * 64 in image else COMMIT
            metadata = {"Config": {"Labels": {"org.opencontainers.image.revision": revision}}, "Architecture": "arm64"}
            return subprocess.CompletedProcess(argv, 0, json.dumps(metadata) + "\n", "")
        return subprocess.CompletedProcess(argv, 0, "", "")


@unittest.skipIf(deploy_host.fcntl is None, "Deployment host uses Linux file locks")
class DeployHostTests(unittest.TestCase):
    def test_rejects_unpinned_or_wrong_repository_inputs(self):
        cases = [("ghcr.io/other/fruit-box@sha256:" + "a" * 64, COMMIT), (IMAGE, "c" * 39)]
        for image, commit in cases:
            with self.assertRaises(deploy_host.DeploymentError):
                deploy_host.Deployer("dev", image, commit)

    def test_success_persists_after_verification_and_uses_environment_project(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = FakeRunner()
            smoke = Path(directory) / "smoke.mjs"
            smoke.write_text("")
            deploy_host.Deployer("dev", IMAGE, COMMIT, state_root=Path(directory),
                                 smoke_script=smoke, runner=runner).run()
            state = json.loads((Path(directory) / "dev" / "success.json").read_text())
            self.assertEqual(state, {"image": IMAGE, "commit": COMMIT})
            compose_calls = [call[0] for call in runner.calls if call[0][0:2] == ["docker", "compose"]]
            self.assertEqual(compose_calls[0][-2:], ["pull", "game"])
            self.assertIn("fruitbox-dev", compose_calls[0])

    def test_failure_rolls_back_last_successful_release_without_overwriting_state(self):
        with tempfile.TemporaryDirectory() as directory:
            state_dir = Path(directory) / "prod"
            state_dir.mkdir()
            old_image = IMAGE.replace("a" * 64, "c" * 64)
            old = {"image": old_image, "commit": "d" * 40}
            (state_dir / "success.json").write_text(json.dumps(old))
            runner = FakeRunner(smoke_fail=True)
            smoke = Path(directory) / "smoke.mjs"
            smoke.write_text("")
            with self.assertRaises(deploy_host.DeploymentError):
                deploy_host.Deployer("prod", IMAGE, COMMIT, state_root=Path(directory),
                                     smoke_script=smoke, runner=runner).run()
            self.assertEqual(json.loads((state_dir / "success.json").read_text()), old)
            pulls = [call[1]["env"]["FRUITBOX_IMAGE"] for call in runner.calls if "pull" in call[0]]
            self.assertEqual(pulls, [IMAGE])
            replacements = [call[1]["env"]["FRUITBOX_IMAGE"] for call in runner.calls if "up" in call[0]]
            self.assertEqual(replacements, [IMAGE, old_image])

    def test_first_failure_removes_new_container(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = FakeRunner(smoke_fail=True)
            smoke = Path(directory) / "smoke.mjs"
            smoke.write_text("")
            with self.assertRaises(deploy_host.DeploymentError):
                deploy_host.Deployer("dev", IMAGE, COMMIT, state_root=Path(directory),
                                     smoke_script=smoke, runner=runner).run()
            self.assertTrue(any("down" in call[0] for call in runner.calls))

    def test_prod_guard_prevents_legacy_parallel_deployment(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = FakeRunner(legacy=True)
            with self.assertRaisesRegex(deploy_host.DeploymentError, "migration required"):
                deploy_host.Deployer("prod", IMAGE, COMMIT, state_root=Path(directory), runner=runner).run()
            self.assertFalse(any("compose" in call[0] for call in runner.calls))

    def test_forced_ssh_logs_in_ephemerally_without_putting_token_in_arguments(self):
        with tempfile.TemporaryDirectory() as directory:
            smoke = Path(directory) / "smoke.mjs"
            smoke.write_text("")
            runner = FakeRunner()
            token = "secret-token-that-must-not-leak"
            with patch.dict("os.environ", {"SSH_ORIGINAL_COMMAND": f"deploy dev {IMAGE} {COMMIT}"}, clear=False), \
                 patch("sys.stdin", StringIO(json.dumps({"registry_user": "github-actions", "registry_token": token}))):
                deploy_host.Deployer("dev", IMAGE, COMMIT, state_root=Path(directory), smoke_script=smoke,
                                     runner=runner).run()
            login = next(call for call in runner.calls if call[0][0:3] == ["docker", "login", "ghcr.io"])
            self.assertNotIn(token, login[0])
            self.assertEqual(login[1]["input"], token)
            config_dir = login[1]["env"]["DOCKER_CONFIG"]
            self.assertFalse(Path(config_dir).exists())

    def test_dev_overlay_is_used_only_when_adjacent_host_env_and_overlay_exist(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            compose = root / "compose.managed.yaml"
            overlay = root / "compose.dev-access.yaml"
            host_env = root / "host.env"
            compose.write_text("services: {}\n")
            overlay.write_text("services: {}\n")
            host_env.write_text("FRUITBOX_DEV_BIND=100.64.0.2\n")
            smoke = root / "smoke.mjs"
            smoke.write_text("")
            runner = FakeRunner()
            deploy_host.Deployer("dev", IMAGE, COMMIT, state_root=root / "state", compose_path=compose,
                                 smoke_script=smoke, runner=runner).run()
            compose_call = next(call[0] for call in runner.calls if "pull" in call[0])
            self.assertIn(str(host_env), compose_call)
            self.assertIn(str(overlay), compose_call)


if __name__ == "__main__":
    unittest.main()
