# Documentation media

This folder sits alongside `docs/adr/`. Keep supporting media for each decision in `adr-NNNN/`, matching its stable ADR identifier: ADR 0001 owns `adr-0001/`, ADR 0002 owns `adr-0002/`, and so on.

Store pictures, exported diagrams, and concise recordings with descriptive filenames. Reference them relatively from the owning ADR so the media travels with a clone. For example, inside ADR 0001:

```markdown
![Selection conflict illustration](../assets/adr-0001/selection-conflict.png)
[Conflict-flow recording](../assets/adr-0001/conflict-flow.mp4)
```

These filenames illustrate the convention; no media has been attached to ADR 0001 yet. Its `.gitkeep` preserves the empty folder in Git. Retain media needed by historical or superseded decisions. Mermaid source remains beside the owning prose; exported images belong here when useful.

The [ADR register](../adr/README.md) links each record to its media folder. Follow the [visual evidence requirements](../development-workflow.md#visual-evidence), and keep private data out of committed media. PR evidence can reuse these assets while providing an accessible preview for reviewers.
