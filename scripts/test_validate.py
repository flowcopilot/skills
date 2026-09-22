from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from validate import validate_bundle, validate_repository


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def skill(self, name="example", fields="", description="Build a useful example."):
        directory = self.root / "skills" / name
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "SKILL.md").write_text(
            f"---\nname: {name}\ndescription: {description}\n{fields}---\n\n# Example\n",
            encoding="utf-8",
        )
        return directory

    def test_valid_skill_with_optional_fields(self):
        directory = self.skill(fields='license: MIT\ncompatibility: Requires Python\nallowed-tools: Read\nmetadata:\n  author: example\n  version: "1"\n')
        self.assertEqual(validate_bundle(directory), [])

    def test_reference_validator_rejects_names_and_unknown_fields(self):
        for name in ("BadName", "bad--name", "bad_name", "a" * 65):
            with self.subTest(name=name):
                self.assertTrue(validate_bundle(self.skill(name)))
        self.assertTrue(validate_bundle(self.skill(fields="unsupported: value\n")))

    def test_required_fields_and_length_limits(self):
        self.assertTrue(validate_bundle(self.skill(description="x" * 1025)))
        self.assertTrue(validate_bundle(self.skill(fields=f'compatibility: {"x" * 501}\n')))
        directory = self.skill()
        (directory / "SKILL.md").write_text("---\nname: example\n---\n")
        self.assertTrue(validate_bundle(directory))
        (directory / "SKILL.md").write_text("---\nname: different\ndescription: Example\n---\n")
        self.assertTrue(validate_bundle(directory))

    def test_optional_field_types_are_checked_beyond_reference_validator(self):
        for fields in ("license:\n  - MIT\n", "allowed-tools: 42\n", "metadata: wrong\n", "metadata:\n  version: 1\n", 'compatibility: ""\n'):
            with self.subTest(fields=fields):
                self.assertTrue(validate_bundle(self.skill(fields=fields)))

    def test_invalid_yaml_and_duplicate_fields(self):
        directory = self.skill()
        for text in ("No frontmatter", "---\nname: [\n---\n", "---\nname: example\nname: duplicate\ndescription: Example\n---\n"):
            with self.subTest(text=text):
                (directory / "SKILL.md").write_text(text)
                self.assertTrue(validate_bundle(directory))

    def test_repository_discovers_all_bundles_and_reports_missing_entries(self):
        self.skill("first")
        self.skill("second")
        (self.root / "skills" / "missing").mkdir()
        count, problems = validate_repository(self.root)
        self.assertEqual(count, 3)
        self.assertEqual(len(problems), 1)
        self.assertIn("missing", problems[0])

    def test_empty_repository_and_nested_skills_fail(self):
        self.assertTrue(validate_repository(self.root)[1])
        (self.root / "skills").mkdir()
        self.assertTrue(validate_repository(self.root)[1])
        directory = self.skill()
        nested = directory / "references" / "SKILL.md"
        nested.parent.mkdir()
        nested.write_text("Nested skill")
        self.assertTrue(validate_repository(self.root)[1])


if __name__ == "__main__":
    unittest.main()
