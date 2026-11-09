---
name: implement
description: Implement an agreed issue or plan through behavior tests, verification, review, and a focused GitHub pull request.
---

# Implement agreed work

Read AGENTS.md, docs/agents/issue-tracker.md, and the complete issue including comments and blocking dependencies. Use settled requirements as the contract. Confirm any unresolved decision that prevents correct implementation; routine choices within the agreed scope can proceed.

1. Inspect the working tree and preserve unrelated changes. Keep a plan with acceptance criteria, affected boundaries, and verification. Use a focused branch tied to the issue.
2. Read [tdd](../tdd/SKILL.md) for behavioral changes and [codebase-design](../codebase-design/SKILL.md) when the interface is in question. Use agreed test boundaries. Work one behavior at a time and run the relevant checks.
3. Use subagents only when authorized and available. Delegate bounded work with explicit file ownership and acceptance criteria; inspect and verify every result. Use the user's configured model rather than a hardcoded model or orchestrator name.
4. Validate relevant runtime behavior, including actual phone interaction when acceptance depends on touch or backgrounding. Record unavailable checks as pending. A headless machine cannot claim visual verification it did not perform.
5. Update documents owned by the change and record consequential accepted decisions in ADRs. Review the diff against the issue and repository instructions, using [code-review](../code-review/SKILL.md) where appropriate. Resolve actionable findings and rerun checks justified by the final changes.
6. Commit verified work and open a focused PR using gh. Include the issue link, concrete outcome, checks actually performed, and any remaining limitations. Preserve closing keywords for fully resolved issues. Human review and merging follow the project workflow; an implementation task is not an instruction to merge or deploy.

Keep the issue's status current. Completion means the requested behavior is demonstrated, applicable checks pass, required documentation is updated, and the PR is available for review. Clearly identify outstanding acceptance or user-decision items rather than declaring them passed.
