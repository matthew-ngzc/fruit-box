# Skill mechanics

The skill-specific branch of [writing-for-agents](SKILL.md): frontmatter, invocation policy, and router skills. Shared writing principles remain in SKILL.md.

## Invocation in this repository

Every skill keeps `name` and `description` in SKILL.md frontmatter. The description explains when it applies; keep it concise and discriminating.

A model-invoked skill can be selected automatically when relevant. This is the default. A user-invoked skill is selected only when the user requests it. For explicit-only behavior, set the following in that skill's `agents/openai.yaml`:

```yaml
policy:
  allow_implicit_invocation: false
```

Preserve an existing invocation policy when editing a skill. Do not add `disable-model-invocation` to SKILL.md frontmatter: that is an invocation convention from a different agent ecosystem, not the Codex metadata format used by these repository skills. The repository setup check rejects it to prevent contradictory guidance from reappearing.

An agent without native skill discovery can read the catalog and selected SKILL.md files directly, while honoring explicit-only selection. Follow relative references to helper skills; a tool specifically named Skill is not a prerequisite.

## Splitting by invocation

Split a reusable discipline into a separate skill when it has a distinct trigger or multiple workflows need it. Consider discovery/context overhead before creating a new skill. A user-requested wrapper can read model-invoked helper skills, keeping the reusable procedure in one place.

## Router skills

A router helps a user choose among explicit-only workflows when the set is hard to remember. It can describe which workflow fits and ask the user to invoke the selected explicit-only workflow. It does not turn an explicit-only skill into an automatically selected one.

Shared reference material belongs in a helper skill or ordinary relative Markdown reference. Keep the catalog and supporting files inside the repository so the same routing works after cloning on another machine.
