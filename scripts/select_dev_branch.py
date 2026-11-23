#!/usr/bin/env python3
"""Select the trusted dev branch and request its deployment."""

import argparse
import json
import subprocess
from urllib.parse import quote


def gh(*args: str, capture: bool = True) -> str:
    result = subprocess.run(
        ["gh", *args], check=True, text=True,
        capture_output=capture,
    )
    return result.stdout.strip() if capture else ""


def select(branch: str) -> None:
    if branch == "main" or not branch.strip():
        raise ValueError("dev branch must be a non-main branch")

    repo = gh("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")
    default_branch = gh("repo", "view", "--json", "defaultBranchRef", "--jq",
                        ".defaultBranchRef.name")
    try:
        # Inspect actual default-branch contents, not registered workflows from
        # unmerged branches. `gh workflow list` has no --ref option.
        gh("api", f"repos/{repo}/contents/.github/workflows/deploy.yml?ref={quote(default_branch, safe='')}")
    except subprocess.CalledProcessError as error:
        if "404" not in ((error.stderr or "") + (error.stdout or "")):
            raise
        raise ValueError(
            "deploy.yml is not on the default branch yet; bootstrap the selected "
            "implementation branch with install_deploy_host.py, push it and rerun "
            "that push-triggered run after authorization. Manual dispatch requires "
            "the reviewed stack to reach the default branch."
        ) from error
    encoded = quote(branch, safe="")
    gh("api", f"repos/{repo}/branches/{encoded}")
    prs = json.loads(gh("pr", "list", "--repo", repo, "--head", branch,
                        "--state", "open", "--json",
                        "number,headRepository"))
    same_repo_prs = [
        pr for pr in prs
        if (pr.get("headRepository") or {}).get("nameWithOwner") == repo
    ]
    if not same_repo_prs:
        raise ValueError(f"{branch!r} has no open pull request in {repo}")

    policy_path = f"repos/{repo}/environments/dev/deployment-branch-policies"
    policies = json.loads(gh("api", policy_path)).get("branch_policies", [])
    selected_id = next((p["id"] for p in policies if p.get("name") == branch), None)
    if selected_id is None:
        created = json.loads(gh("api", "--method", "POST", policy_path,
                                "-f", f"name={branch}", "-f", "type=branch"))
        selected_id = created["id"]

    # Add first, then remove old policies, so a transient failure cannot leave
    # the environment with no permitted branch.
    for policy in policies:
        if policy["id"] != selected_id:
            gh("api", "--method", "DELETE",
               f"{policy_path}/{policy['id']}", capture=False)
    gh("variable", "set", "DEV_BRANCH", "--repo", repo, "--body", branch,
       capture=False)
    gh("workflow", "run", "deploy.yml", "--repo", repo, "--ref", branch,
       "-f", f"dev_branch={branch}", capture=False)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("branch", help="same-repository branch with an open PR")
    args = parser.parse_args()
    try:
        select(args.branch)
    except (subprocess.CalledProcessError, ValueError, KeyError, json.JSONDecodeError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
