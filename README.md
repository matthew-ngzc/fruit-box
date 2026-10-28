# Fruit Box

A personal Fruit Box project exploring solo play and real-time competition between friends on a shared board, accessible from iPhone and Android browsers.

The project is currently in research and design. The backend language, multiplayer framework, and hosting approach are being evaluated; no playable application is implemented yet.

## Continue with an agent

Clone this repository, read [AGENTS.md](AGENTS.md), and follow [the resume guide](docs/agents/resume.md). Relevant skills and supporting resources are versioned under `.agents/skills/`, with [a catalog](docs/agents/skills.md). [CLAUDE.md](CLAUDE.md) points to the same instructions for agents that use that entrypoint.

Use [GitHub Issues](https://github.com/matthew-ngzc/fruit-box/issues) for agreed work and [pull requests](https://github.com/matthew-ngzc/fruit-box/pulls) for delivery. GitHub changes use the `gh` CLI. See [the development workflow](docs/development-workflow.md) for planning, behavior tests, and review.

## Context and checks

- [Research index](docs/README.md)
- [Confirmed rules and open decisions](docs/design-session.md)
- [Domain glossary](CONTEXT.md)
- [Architecture decision register](docs/adr/README.md)
- [CI/CD pipeline and deployment readiness](docs/ci-cd.md)

The portable documentation/agent-setup checks use Python 3's standard library:

```sh
python3 scripts/check_agent_setup.py
python3 -m unittest discover -s tests -p 'test_*.py'
```

On Windows, `python` may be the executable name. Application build/test commands will be added with the selected stack. Credentials and private infrastructure access are configured on each machine, not stored in this public repository. Imported skill licensing is documented in [the skill notice](.agents/skills/NOTICE.md).
