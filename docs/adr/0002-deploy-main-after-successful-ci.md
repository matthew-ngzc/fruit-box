# Deploy reviewed main changes after successful CI

Status: Accepted
Date: 2026-10-29

## Context

The owner requested CI/CD and explicitly selected automatic deployment after reviewed changes merge to main and CI passes, rather than a manual deployment trigger. The owner also chose to select hosting later.

## Decision

Once the application and target are ready, deploy main automatically only after required CI succeeds for the revision being delivered. PR checks remain separate from deployment. This accepts the delivery policy, not a hosting provider, runtime, credential mechanism or deployment implementation.

## Consequences

Reviewed merges will be deliverable without a separate routine manual trigger, so application checks and commit identity must be trustworthy before delivery is enabled. [Issue 6](https://github.com/matthew-ngzc/fruit-box/issues/6) establishes CI; [issue 7](https://github.com/matthew-ngzc/fruit-box/issues/7) remains blocked by the stack, host and deployable application. No live deployment is performed by this decision.

The maintained pipeline explanation is in [CI/CD](../ci-cd.md). Supporting pictures or recordings belong in [adr-0002](../assets/adr-0002/); none is attached yet.
