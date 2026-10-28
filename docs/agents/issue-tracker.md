# Issue tracker configuration

- Tracker: GitHub Issues.
- Repository: `matthew-ngzc/fruit-box`.
- Interface: GitHub CLI (`gh`), with `--repo matthew-ngzc/fruit-box` when outside the checkout.
- Durable game context: `CONTEXT.md`, `docs/design-session.md`, and `docs/adr/`.
- Issue and PR body format: `docs/development-workflow.md` and `.github/` templates.

Use `gh issue view <number> --comments` before starting an issue. Use `gh pr view <number>` and `gh pr diff <number>` to recover review context; a PR's base branch supplies its review baseline when the work clearly identifies that PR. Use body files for multiline writes. Retry read-only network/API failures with network access before changing authentication configuration.

## Status vocabulary

- `needs-decision`: a human product, architecture, or interaction decision is still required.
- `ready-for-agent`: requirements and prerequisites are settled enough to implement.
- `in-progress`: an agent is actively working on it.
- `in-review`: a PR is available for review.

Apply status labels to issues and keep their bodies current. A spec containing unresolved decisions is not ready for autonomous implementation merely because a generic skill normally labels new specs ready-for-agent. Use explicit blocking issue references or native GitHub dependency links to capture real prerequisites. Do not impose dependencies merely because tickets were listed in a particular order.

The configured tracker replaces any generic instruction to run a global setup skill. No separate global setup is needed on a new machine.
