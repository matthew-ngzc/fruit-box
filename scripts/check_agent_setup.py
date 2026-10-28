"""Check portable agent entrypoints, skill metadata, and local Markdown references."""

from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


def check(root: Path) -> list[str]:
    errors = []
    required = (
        "AGENTS.md", "CLAUDE.md", "CONTEXT.md", "docs/design-session.md",
        "docs/development-workflow.md", "docs/agents/resume.md",
        "docs/agents/issue-tracker.md", "docs/agents/skills.md",
        ".agents/skills/UPSTREAM-LICENSE.txt", ".agents/skills/NOTICE.md",
    )
    for relative in required:
        if not (root / relative).is_file():
            errors.append(f"Missing entrypoint: {relative}")

    skills = sorted((root / ".agents/skills").glob("*/SKILL.md"))
    if not skills:
        errors.append("No repository skills found")
    catalog = root / "docs/agents/skills.md"
    if catalog.is_file():
        names = re.findall(r"^\| `([a-z0-9-]+)` \|", catalog.read_text(encoding="utf-8-sig"), re.M)
        for name in names:
            if not (root / ".agents/skills" / name / "SKILL.md").is_file():
                errors.append(f"Missing catalog skill: {name}")
    for skill in skills:
        content = skill.read_text(encoding="utf-8-sig")
        header = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", content, re.S)
        if not header:
            errors.append(f"Missing skill frontmatter: {skill.relative_to(root)}")
            continue
        name = re.search(r"^name:\s*([a-z0-9-]+)\s*$", header[1], re.M)
        description = re.search(r"^description:\s*\S", header[1], re.M)
        if not name or name[1] != skill.parent.name or not description:
            errors.append(f"Invalid skill name/description: {skill.relative_to(root)}")
        if not (skill.parent / "agents/openai.yaml").is_file():
            errors.append(f"Missing skill invocation metadata: {skill.parent.name}")

    markdown = [root / "AGENTS.md", root / "CLAUDE.md", root / "CONTEXT.md"]
    markdown += sorted((root / "docs").rglob("*.md"))
    markdown += sorted((root / ".agents/skills").rglob("*.md"))
    for document in markdown:
        if not document.is_file():
            continue
        # Examples in fenced code are not document dependencies.
        content = re.sub(r"```.*?```", "", document.read_text(encoding="utf-8-sig"), flags=re.S)
        if re.search(r"(?:[A-Za-z]:[\\/](?:Users|Program Files)[\\/]|/Users/|/home/)", content):
            errors.append(f"Machine-specific path: {document.relative_to(root)}")
        for target in re.findall(r"!?\[[^\]]*\]\(([^\s)]+)\)", content):
            target = target.strip("<>")
            parsed = urlsplit(target)
            if parsed.scheme or target.startswith(("#", "//")):
                continue
            path = unquote(parsed.path)
            if path and not (document.parent / path).exists():
                errors.append(f"Broken reference in {document.relative_to(root)}: {target}")
    return errors


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[1]
    problems = check(project_root)
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    count = len(list((project_root / ".agents/skills").glob("*/SKILL.md")))
    print(f"Agent setup check passed ({count} skills; local references and portable paths checked).")
