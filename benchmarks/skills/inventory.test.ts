import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { markdownLinks, reachableMarkdown, treeMentions } from "../../scripts/markdown-links";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
});

test("extracts inline, titled, angle, and reference links", () => {
  expect(markdownLinks([
    "[one](references/one.md)",
    "[`two`](references/two.md#section \"Title\")",
    "[space](<references/three four.md>)",
    "[nested](references/a(b).md)",
    "[full][guide] [collapsed][] [shortcut]",
    "[guide]: references/full.md",
    "[collapsed]: references/collapsed.md",
    "[shortcut]: references/shortcut.md",
  ].join("\n"))).toEqual([
    "references/one.md", "references/two.md#section", "references/three four.md", "references/a(b).md",
    "references/full.md", "references/collapsed.md", "references/shortcut.md",
  ]);
});

test("excludes plain paths, code, comments, images, and escaped links", () => {
  expect(markdownLinks([
    "references/plain.md", "`[inline](references/inline.md)`",
    "```md", "[fenced](references/fenced.md)", "```",
    "~~~md", "[tilde](references/tilde.md)", "~~~",
    "", "    [indented](references/indented.md)",
    "<!-- [comment](references/comment.md) -->",
    "![image](references/image.md)", "\\[escaped](references/escaped.md)",
  ].join("\n"))).toEqual([]);
});

test("keeps links in list continuations and nested list items", () => {
  expect(markdownLinks([
    "- Read the following references:", "", "    [continued](references/continued.md)",
    "    - [nested](references/nested.md)",
    "", "          [code](references/code.md)",
  ].join("\n"))).toEqual(["references/continued.md", "references/nested.md"]);
});

test("follows links relative to each reached file and terminates cycles", () => {
  const directory = mkdtempSync(resolve(import.meta.dir, ".reach-test-"));
  directories.push(directory);
  const contents = {
    "SKILL.md": "[start](references/start.md)\nreferences/plain.md\n[external](https://example.test/other.md)",
    "references/start.md": "[next](nested/next.md#part)\n[entry](../SKILL.md)",
    "references/nested/next.md": "[start](../start.md)\n[space](../space%20name.md)\n[escaped](../../../outside.md)",
    "references/space name.md": "# Reached",
    "references/plain.md": "[hidden](hidden.md)",
    "references/hidden.md": "# Reached through a plain path",
    "references/orphan.md": "# Unreachable",
  };
  for (const [name, text] of Object.entries(contents)) {
    mkdirSync(dirname(resolve(directory, name)), { recursive: true });
    writeFileSync(resolve(directory, name), text);
  }
  const files = Object.keys(contents).map((name) => resolve(directory, name));
  expect([...reachableMarkdown(resolve(directory, "SKILL.md"), files)].sort()).toEqual([
    "SKILL.md", "references/start.md", "references/nested/next.md", "references/space name.md",
    "references/plain.md", "references/hidden.md",
  ].map((name) => resolve(directory, name)).sort());
});

test("follows code and plain path mentions relative to the file or the references root", () => {
  const directory = mkdtempSync(resolve(import.meta.dir, ".reach-test-"));
  directories.push(directory);
  const contents = {
    "SKILL.md": "Read [router](references/router.md).",
    "references/router.md": "See `router/routes.md`.\n- router/tabs.md -- tabs",
    "references/router/routes.md": "# Routes",
    "references/router/tabs.md": "# Tabs",
    "references/other.md": "# Unreachable",
  };
  for (const [name, text] of Object.entries(contents)) {
    mkdirSync(dirname(resolve(directory, name)), { recursive: true });
    writeFileSync(resolve(directory, name), text);
  }
  const files = Object.keys(contents).map((name) => resolve(directory, name));
  expect([...reachableMarkdown(resolve(directory, "SKILL.md"), files)].sort()).toEqual([
    "SKILL.md", "references/router.md", "references/router/routes.md", "references/router/tabs.md",
  ].map((name) => resolve(directory, name)).sort());
});

test("joins bare file names in a code block tree with their folders", () => {
  expect(treeMentions([
    "Consult these resources:", "", "```", "expo-router/",
    "  tabs.md                NativeTabs and iOS 26 features",
    "  nested/", "    deep.md  Nested entry", "  search.md  Search bar", "```",
    "", "tabs.md outside the block", "```text", "orphan.md  no folder", "```",
  ].join("\n"))).toEqual(["expo-router/tabs.md", "expo-router/nested/deep.md", "expo-router/search.md"]);
  expect(treeMentions("```text\nskills/example/\n|-- SKILL.md\n`-- references/\n    `-- workflow-a.md\n```")).toEqual([
    "skills/example/SKILL.md", "skills/example/references/workflow-a.md",
  ]);
});
