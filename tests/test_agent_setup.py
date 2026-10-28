"""Exercise failures that would stop an agent resuming on another machine."""

from pathlib import Path
import runpy
import tempfile
import unittest


CHECK = runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts/check_agent_setup.py"))["check"]


class AgentSetupTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="fruit-box-agent-setup-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        for relative in (
            "README.md", "AGENTS.md", "CLAUDE.md", "CONTEXT.md", "docs/design-session.md",
            "docs/development-workflow.md", "docs/agents/resume.md",
            "docs/agents/issue-tracker.md", "docs/agents/skills.md",
            ".agents/skills/UPSTREAM-LICENSE.txt", ".agents/skills/NOTICE.md",
            ".agents/skills/example/agents/openai.yaml",
        ):
            self.write(relative, "Fixture\n")
        self.write("docs/agents/skills.md", "| `example` | Fixture skill |\n")
        self.write(".agents/skills/example/SKILL.md", "---\nname: example\ndescription: Fixture skill\n---\n")

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def test_complete_portable_setup_passes(self):
        self.assertEqual(CHECK(self.root), [])

    def test_missing_referenced_resource_is_reported(self):
        self.write("docs/agents/resume.md", "Read [the guide](missing-guide.md).\n")
        self.assertIn("Broken reference in docs/agents/resume.md: missing-guide.md", [error.replace("\\", "/") for error in CHECK(self.root)])

    def test_missing_catalog_skill_is_reported(self):
        self.write("docs/agents/skills.md", "| `example` | Fixture |\n| `missing` | Required |\n")
        self.assertIn("Missing catalog skill: missing", CHECK(self.root))

    def test_root_readme_references_are_checked(self):
        self.write("README.md", "Start with [the guide](missing-resume.md).\n")
        self.assertIn("Broken reference in README.md: missing-resume.md", CHECK(self.root))

    def test_unsupported_invocation_frontmatter_is_reported(self):
        self.write(".agents/skills/example/SKILL.md", "---\nname: example\ndescription: Fixture\ndisable-model-invocation: true\n---\n")
        self.assertTrue(any(error.startswith("Unsupported invocation frontmatter:") for error in CHECK(self.root)))

    def test_machine_specific_dependency_is_reported(self):
        self.write("AGENTS.md", "Read C:/Users/someone/private/SKILL.md before starting.\n")
        self.assertIn("Machine-specific path: AGENTS.md", CHECK(self.root))

    def test_external_links_and_fenced_examples_are_not_dependencies(self):
        self.write("docs/agents/resume.md", "[Source](https://example.com/missing)\n```\n[Example](not-a-file.md)\n```\n")
        self.assertEqual(CHECK(self.root), [])


if __name__ == "__main__":
    unittest.main()
