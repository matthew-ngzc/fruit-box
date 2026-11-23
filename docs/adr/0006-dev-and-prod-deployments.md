# Separate branch-selected dev and main-only production deployments

Status: Accepted

Date: 2026-11-23

## Context

The owner chose a Raspberry Pi running Docker as the host, with public game access through the existing Cloudflare Tunnel and Caddy. Development needs a stable place to try an unmerged PR without replacing the public game. The owner accepted selecting one dev branch manually and automatically deploying subsequent pushes to it; reviewed `main` remains production under [ADR 0002](0002-deploy-main-after-successful-ci.md).

## Decision

Use GitHub Environments `dev` and `prod`, separate Compose projects and per-environment forced-command SSH keys. GitHub-hosted runners run application checks, build ARM64 images, publish immutable GHCR digests, and deploy over a temporary tagged Tailscale connection. Keep deployment secrets out of ordinary PR checks and retain the existing Cloudflare public ingress for production. A shared dev instance follows one same-repository PR branch selected by the owner; local agent servers remain useful for immediate iteration.

## Consequences

The Pi runs images rather than building each release. Separate credentials, branch policies, deployment locks and resource limits constrain accidental cross-environment changes, though both environments still share one host. Replacing an instance ends its in-memory matches; deployments are not zero downtime. Failed startup or smoke checks restore the previous successful image. Environments describe deployment policy rather than providing hosting. Tailscale authorization and the existing public game's first production cutover require explicit operator setup; the implementation must not silently replace an unmanaged public instance.

See [CI/CD](../ci-cd.md) for the maintained deployment flow and pending verification. [Issue 7](https://github.com/matthew-ngzc/fruit-box/issues/7) tracks delivery. This extends rather than supersedes ADR 0002.
