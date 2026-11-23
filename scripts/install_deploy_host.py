#!/usr/bin/env python3
"""Install fixed deployment commands and provision GitHub environment credentials.

Run locally on the ARM64 deployment host as the account that runs Docker.
No game is started, stopped or replaced by this installer.
"""
import argparse
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess

REPO = "matthew-ngzc/fruit-box"
SOURCE = Path(__file__).resolve().parent.parent


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs).stdout


def api(path, method="GET", data=None):
    args = ["gh", "api", "--method", method, f"repos/{REPO}/{path}"]
    if data is not None:
        args += ["--input", "-"]
    result = run(args, input=json.dumps(data) if data is not None else None)
    return json.loads(result) if result.strip() else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dev-branch", required=True)
    parser.add_argument("--root", type=Path, default=Path.home() / ".local/state/fruitbox-deploy")
    args = parser.parse_args()
    os.umask(0o077)
    run(["gh", "auth", "status"])
    run(["docker", "info", "--format", "{{.Architecture}}"])
    run(["git", "check-ref-format", "--branch", args.dev_branch])
    if args.dev_branch == "main":
        parser.error("dev must select an unmerged PR branch, not main")
    status = json.loads(run(["tailscale", "status", "--json"]))
    if status.get("BackendState") != "Running":
        parser.error("Tailscale must already be running")
    address = next(ip for ip in status["Self"]["TailscaleIPs"] if ":" not in ip)
    account = run(["id", "-un"]).strip()
    host_key = Path("/etc/ssh/ssh_host_ed25519_key.pub").read_text().split()
    known_hosts = f"{address} {host_key[0]} {host_key[1]}\n"
    destination = args.root.expanduser().resolve()
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    for source, target in [
        ("scripts/deploy_host.py", "deploy_host.py"),
        ("scripts/check_container.mjs", "check_container.mjs"),
        ("deploy/compose.managed.yaml", "compose.managed.yaml"),
        ("deploy/compose.dev-access.yaml", "compose.dev-access.yaml"),
    ]:
        shutil.copyfile(SOURCE / source, destination / target)
        (destination / target).chmod(0o600)
    (destination / "host.env").write_text(f"FRUITBOX_DEV_BIND={address}\n")
    (destination / "host.env").chmod(0o600)
    ssh_dir = Path.home() / ".ssh"
    ssh_dir.mkdir(mode=0o700, exist_ok=True)
    authorized = ssh_dir / "authorized_keys"
    existing = authorized.read_text() if authorized.exists() else ""
    for environment, branch in [("dev", args.dev_branch), ("prod", "main")]:
        api(f"environments/{environment}", "PUT", {
            "deployment_branch_policy": {"protected_branches": False, "custom_branch_policies": True}
        })
        rules = api(f"environments/{environment}/deployment-branch-policies")["branch_policies"]
        if not any(item["name"] == branch and item.get("type", "branch") == "branch" for item in rules):
            api(f"environments/{environment}/deployment-branch-policies", "POST", {"name": branch, "type": "branch"})
        # Production must never retain permissive pre-existing branch/tag rules.
        for item in rules:
            if item["name"] != branch or item.get("type", "branch") != "branch":
                api(f"environments/{environment}/deployment-branch-policies/{item['id']}", "DELETE")
        key = destination / f"{environment}_ed25519"
        if not key.exists():
            run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", f"fruitbox-deploy-{environment}", "-f", str(key)])
        public = key.with_suffix(".pub").read_text().strip()
        command = shlex.join(["/usr/bin/env", f"FRUITBOX_DEPLOY_ROOT={destination}", "/usr/bin/python3", str(destination / "deploy_host.py"), "--environment", environment])
        if '"' in command or "\n" in command:
            parser.error("deployment root cannot contain a double quote or newline")
        line = f'from="100.64.0.0/10,fd7a:115c:a1e0::/48",restrict,command="{command}" {public}'
        # Replace only this provisioner's own key line; preserve unrelated SSH access.
        public_material = " ".join(public.split()[:2])
        existing = "\n".join(s for s in existing.splitlines() if public_material not in s)
        existing = existing.rstrip("\n") + "\n" + line + "\n"
        authorized.write_text(existing)
        authorized.chmod(0o600)
        for name, value in [("DEPLOY_SSH_KEY", key.read_text()), ("DEPLOY_KNOWN_HOSTS", known_hosts)]:
            run(["gh", "secret", "set", name, "--repo", REPO, "--env", environment], input=value)
        for name, value in [("DEPLOY_HOST", address), ("DEPLOY_USER", account), ("TS_DEPLOY_TAGS", "tag:fruitbox-ci")]:
            run(["gh", "variable", "set", name, "--repo", REPO, "--env", environment, "--body", value])
        print(f"Provisioned {environment}: restricted SSH key, pinned host key and branch policy.")
    run(["gh", "variable", "set", "DEV_BRANCH", "--repo", REPO, "--body", args.dev_branch])
    print("Host commands installed. No running game was changed. Configure Tailscale OAuth next.")


if __name__ == "__main__":
    main()
