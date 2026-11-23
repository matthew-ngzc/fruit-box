#!/usr/bin/env python3
"""Deploy one immutable Fruit Box image on the managed host.

The same entry point is suitable for a forced SSH key.  A forced key should
invoke this file with ``--environment dev`` or ``--environment prod``; the
original SSH command must then be exactly ``deploy <dev|prod> <image> <commit>``.
"""

from __future__ import annotations

import argparse
try:
    import fcntl
except ImportError:  # pragma: no cover - host deployment runs on Linux
    fcntl = None
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile

REPOSITORY = "ghcr.io/matthew-ngzc/fruit-box"
IMAGE_REPOSITORY_PREFIX = REPOSITORY + "@sha256:"
ENVIRONMENTS = {"dev", "prod"}


class DeploymentError(RuntimeError):
    pass


def validate_release(environment: str, image: str, commit: str) -> None:
    if environment not in ENVIRONMENTS:
        raise DeploymentError("environment must be dev or prod")
    digest = image.removeprefix(IMAGE_REPOSITORY_PREFIX)
    if not image.startswith(IMAGE_REPOSITORY_PREFIX) or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        raise DeploymentError("image must be the pinned Fruit Box GHCR digest")
    if len(commit) != 40 or any(c not in "0123456789abcdef" for c in commit):
        raise DeploymentError("commit must be a 40-character lowercase hexadecimal SHA")



class Deployer:
    def __init__(self, environment: str, image: str, commit: str, *, state_root: Path | None = None,
                 compose_path: Path | None = None, smoke_script: Path | None = None,
                 runner=subprocess.run,
                 logger=print):
        validate_release(environment, image, commit)
        self.environment, self.image, self.commit = environment, image, commit
        self.state_dir = (state_root or Path(os.environ.get("FRUITBOX_DEPLOY_ROOT", "~/.local/state/fruitbox-deploy")).expanduser()) / environment
        default_compose = Path(__file__).resolve().with_name("compose.managed.yaml")
        if not default_compose.exists():
            default_compose = Path(__file__).resolve().parents[1] / "deploy" / "compose.managed.yaml"
        self.compose_path = compose_path or default_compose
        self.smoke_script = smoke_script or Path(__file__).with_name("check_container.mjs")
        self.runner, self.log = runner, logger
        self.extra_env: dict[str, str] = {}
        self.project = f"fruitbox-{environment}"
        self.alias = "fruitbox-dev" if environment == "dev" else "fruitbox-game"
        self.access_overlay = self.compose_path.with_name("compose.dev-access.yaml") if environment == "dev" else None
        self.host_env = self.compose_path.with_name("host.env") if environment == "dev" else None

    def _compose_prefix(self) -> list[str]:
        prefix = ["docker", "compose", "--project-name", self.project]
        if self.host_env and self.access_overlay and self.host_env.exists() and self.access_overlay.exists():
            prefix.extend(["--env-file", str(self.host_env)])
        prefix.extend(["--file", str(self.compose_path)])
        if self.host_env and self.access_overlay and self.host_env.exists() and self.access_overlay.exists():
            prefix.extend(["--file", str(self.access_overlay)])
        return prefix

    def _run(self, *args: str) -> None:
        self.log("deploy: docker compose " + " ".join(args))
        result = self.runner([*self._compose_prefix(), *args],
                             env={**os.environ, **self.extra_env, "FRUITBOX_IMAGE": self.image, "FRUITBOX_COMPOSE_PROJECT": self.project,
                                  "FRUITBOX_NETWORK_ALIAS": self.alias}, check=False, timeout=300)
        if getattr(result, "returncode", 0) != 0:
            raise DeploymentError(f"docker compose {' '.join(args)} failed")

    def _reject_unmigrated_legacy_prod(self) -> None:
        """Do not silently run a second production game beside fruitbox-trip."""
        if self.environment != "prod" or (self.state_dir / "success.json").exists():
            return
        result = self.runner([
            "docker", "ps", "--filter", "label=com.docker.compose.project=fruitbox-trip",
            "--filter", "label=com.docker.compose.service=game", "--format", "{{.ID}}",
        ], capture_output=True, text=True, check=False)
        if getattr(result, "returncode", 0) != 0:
            raise DeploymentError("unable to check legacy production containers")
        if getattr(result, "stdout", "").strip():
            raise DeploymentError(
                "managed prod migration required: running fruitbox-trip game found; "
                "perform the controlled legacy cutover before enabling fruitbox-prod"
            )

    def _smoke(self) -> None:
        if not self.smoke_script.exists():
            raise DeploymentError("real-client smoke script is not installed")
        result = self.runner([
            *self._compose_prefix(),
            "exec", "-T", "game", "node", "--input-type=module",
        ], input=self.smoke_script.read_text(), text=True, timeout=120, check=False,
            env={**os.environ, **self.extra_env, "FRUITBOX_IMAGE": self.image, "FRUITBOX_COMPOSE_PROJECT": self.project,
                 "FRUITBOX_NETWORK_ALIAS": self.alias, "FRUIT_BOX_TEST_URL": "http://127.0.0.1:2567"})
        if getattr(result, "returncode", 0) != 0:
            raise DeploymentError("real HTTP/WebSocket smoke check failed")

    def _verify_image_metadata(self) -> None:
        result = self.runner(["docker", "image", "inspect", self.image, "--format", "{{json .}}"],
                             capture_output=True, text=True, check=False, env={**os.environ, **self.extra_env})
        if getattr(result, "returncode", 0) != 0:
            raise DeploymentError("unable to inspect pulled image")
        try:
            metadata = json.loads(getattr(result, "stdout", "").strip())
            labels = metadata.get("Config", {}).get("Labels") or {}
        except (json.JSONDecodeError, AttributeError) as exc:
            raise DeploymentError("pulled image labels are invalid") from exc
        if labels.get("org.opencontainers.image.revision") != self.commit:
            raise DeploymentError("pulled image revision does not match supplied commit")
        if metadata.get("Architecture") != "arm64":
            raise DeploymentError("pulled image architecture is not arm64")

    def _run_locked(self) -> None:
        self.state_dir.mkdir(parents=True, exist_ok=True)
        lock_path = self.state_dir / "deploy.lock"
        with lock_path.open("a+") as lock:
            if fcntl is None:
                raise DeploymentError("host deployment requires Linux flock support")
            fcntl.flock(lock, fcntl.LOCK_EX)
            state_path = self.state_dir / "success.json"
            previous = json.loads(state_path.read_text()) if state_path.exists() else None
            self._reject_unmigrated_legacy_prod()
            if not self.smoke_script.exists():
                raise DeploymentError(f"smoke script not installed: {self.smoke_script}")
            replacement_started = False
            try:
                self._run("pull", "game")
                self._verify_image_metadata()
                replacement_started = True
                self._run("up", "--detach", "--wait", "--wait-timeout", "90", "game")
                self.log("deploy: active matches are interrupted by replacement; stop grace is 10s")
                self._smoke()
            except Exception as exc:
                self.log(f"deploy: verification/deployment failed: {exc}; rolling back")
                if not replacement_started:
                    raise DeploymentError(f"deployment preflight failed: {exc}") from exc
                try:
                    if previous:
                        self.image = previous["image"]
                        self.commit = previous["commit"]
                        try:
                            self._verify_image_metadata()
                        except DeploymentError:
                            self._run("pull", "game")
                            self._verify_image_metadata()
                        self._run("up", "--detach", "--wait", "--wait-timeout", "90", "game")
                        self._smoke()
                    else:
                        self._run("down", "--remove-orphans")
                except Exception as rollback_exc:
                    raise DeploymentError(f"deployment failed and rollback failed: {rollback_exc}") from exc
                raise DeploymentError("deployment failed; previous release restored" if previous else "deployment failed; new container removed") from exc
            if previous and previous != {"image": self.image, "commit": self.commit}:
                (self.state_dir / "previous.json").write_text(json.dumps(previous, indent=2) + "\n")
            tmp = state_path.with_suffix(".json.tmp")
            tmp.write_text(json.dumps({"image": self.image, "commit": self.commit}, indent=2) + "\n")
            os.replace(tmp, state_path)

    def run(self) -> None:
        if "SSH_ORIGINAL_COMMAND" not in os.environ:
            return self._run_locked()
        try:
            credentials = json.loads(sys.stdin.read(16384))
            user = credentials["registry_user"]
            token = credentials["registry_token"]
            if not isinstance(user, str) or not user or not isinstance(token, str) or not token:
                raise ValueError
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            raise DeploymentError("forced deployment requires registry credentials on stdin") from exc
        with tempfile.TemporaryDirectory(prefix="fruitbox-docker-") as config_dir:
            auth_env = {**os.environ, "DOCKER_CONFIG": config_dir}
            result = self.runner(["docker", "login", "ghcr.io", "--username", user, "--password-stdin"],
                                 input=token, text=True, capture_output=True, check=False, env=auth_env)
            if getattr(result, "returncode", 0) != 0:
                raise DeploymentError("GHCR login failed")
            self.extra_env["DOCKER_CONFIG"] = config_dir
            return self._run_locked()


def _arguments(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=sorted(ENVIRONMENTS), required=False)
    parser.add_argument("--compose-path", type=Path)
    parser.add_argument("release", nargs="*")
    args = parser.parse_args(argv)
    original = os.environ.get("SSH_ORIGINAL_COMMAND")
    if original is not None:
        tokens = shlex.split(original)
        if len(tokens) != 4 or tokens[0] != "deploy":
            parser.error("SSH command must be: deploy <dev|prod> <image> <commit>")
        if args.environment != tokens[1]:
            parser.error("SSH command environment does not match this key")
        if args.release:
            parser.error("release arguments are supplied by SSH_ORIGINAL_COMMAND")
        args.release = tokens[2:]
    if len(args.release) != 2 or not args.environment:
        parser.error("use --environment <dev|prod> <image> <commit>")
    return args


def main(argv: list[str] | None = None) -> int:
    try:
        args = _arguments(argv if argv is not None else sys.argv[1:])
        Deployer(args.environment, args.release[0], args.release[1], compose_path=args.compose_path).run()
        return 0
    except (DeploymentError, ValueError, OSError) as exc:
        print(f"deploy: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
