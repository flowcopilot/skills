import { expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
type Task = {
  id: string;
  prompt: string;
  fixture: string;
  expectedBundles: string[];
  requiredReferences: Record<string, string[]>;
  allowedReferences: Record<string, string[]>;
  checks: { type: string }[];
};
const tasks: Task[] = readFileSync(resolve(import.meta.dir, "tasks.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
const config = JSON.parse(readFileSync(resolve(import.meta.dir, "config.json"), "utf8"));
const bundles = readdirSync(resolve(root, "skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

test("defines unique tasks with existing bundles, fixtures, and reference files", () => {
  expect(tasks.length).toBeGreaterThan(0);
  expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
  const checkTypes = new Set(["route", "http-response", "unchanged", "exists", "word-count", "numbered-steps", "rubric"]);
  for (const task of tasks) {
    expect(Object.keys(task).sort()).toEqual(["id", "prompt", "fixture", "expectedBundles", "requiredReferences", "allowedReferences", "checks"].sort());
    expect(task.id.length).toBeGreaterThan(0);
    expect(task.prompt.length).toBeGreaterThan(0);
    expect(statSync(resolve(import.meta.dir, task.fixture)).isDirectory()).toBe(true);
    expect(new Set(task.expectedBundles).size).toBe(task.expectedBundles.length);
    for (const bundle of task.expectedBundles) {
      expect(bundles).toContain(bundle);
      expect(statSync(resolve(root, "skills", bundle, "SKILL.md")).isFile()).toBe(true);
    }
    expect(Object.keys(task.requiredReferences).sort()).toEqual(task.expectedBundles.slice().sort());
    expect(Object.keys(task.allowedReferences).sort()).toEqual(task.expectedBundles.slice().sort());
    for (const field of ["requiredReferences", "allowedReferences"] as const) {
      for (const [bundle, references] of Object.entries(task[field]) as [string, string[]][]) {
        expect(bundles).toContain(bundle);
        expect(task.expectedBundles).toContain(bundle);
        expect(references.length).toBeGreaterThan(0);
        for (const path of references) {
          expect(path.startsWith("references/")).toBe(true);
          expect(statSync(resolve(root, "skills", bundle, path)).isFile()).toBe(true);
          if (field === "requiredReferences") expect(task.allowedReferences[bundle]).toContain(path);
        }
      }
    }
    expect(task.checks.length).toBeGreaterThan(0);
    for (const check of task.checks) expect(checkTypes.has(check.type)).toBe(true);
    if (task.id.startsWith("expo-")) {
      const pkg = JSON.parse(readFileSync(resolve(import.meta.dir, task.fixture, "package.json"), "utf8"));
      expect(pkg.dependencies.expo).toMatch(/^\d+\.\d+\.\d+$/);
    }
  }
});

test("covers every bundle at least twice and includes a negative control", () => {
  for (const bundle of bundles) {
    expect(tasks.filter((task) => task.expectedBundles.includes(bundle)).length).toBeGreaterThanOrEqual(2);
  }
  const negativeControls = tasks.filter((task) => task.expectedBundles.length === 0);
  expect(negativeControls.length).toBeGreaterThan(0);
  for (const task of negativeControls) {
    expect(task.requiredReferences).toEqual({});
    expect(task.allowedReferences).toEqual({});
  }
  for (const [bundle, sources] of [
    ["react-native", ["software-mansion", "callstack"]],
    ["design-engineering", ["emil-kowalski", "jakub-krehel"]],
    ["agent-surf", ["agent-browser", "agent-device", "agent-desktop"]],
  ] as const) {
    for (const source of sources) {
      expect(tasks.filter((task) => task.requiredReferences[bundle]?.some((path) => path.startsWith(`references/${source}/`))).length).toBeGreaterThanOrEqual(1);
    }
  }
});

test("configures the requested models, conditions, and repeat count", () => {
  expect(config.models).toEqual([
    { cli: "codex", model: "gpt-6-luna", effort: "low" },
    { cli: "codex", model: "gpt-6.1-sol", effort: "low" },
    { cli: "claude", model: "claude-haiku-5-5", effort: "low" },
    { cli: "claude", model: "claude-sonnet-5-5", effort: "low" },
  ]);
  expect(config.repeats).toBe(3);
  expect(config.conditions.map((condition: { id: string }) => condition.id)).toEqual(["no-skills", "all-bundles", "upstream-layout", "expo-overview-entry"]);
  expect(config.conditions[0].bundles).toEqual([]);
  expect(config.conditions[1].bundles.slice().sort()).toEqual(bundles);
  expect(config.conditions[3].bundles.slice().sort()).toEqual(bundles);
  expect(config.conditions[3].taskIds).toEqual(tasks.filter((task) => task.expectedBundles.includes("expo")).map((task) => task.id));
  expect(config.conditions[3].entryOverride).toEqual({ bundle: "expo", bodyFrom: "references/expo-overview.md", preserveFrontmatter: ["name", "description"] });
  expect(existsSync(resolve(root, "skills/expo", config.conditions[3].entryOverride.bodyFrom))).toBe(true);
  for (const condition of config.conditions) {
    if (condition.taskIds) {
      for (const id of condition.taskIds) expect(tasks.map((task) => task.id)).toContain(id);
    }
  }
});

test("defines the published upstream layout from every pinned source", () => {
  const condition = config.conditions.find((condition: { id: string }) => condition.id === "upstream-layout");
  expect(condition.layout).toBe("upstream");
  expect(condition.bundles).toBeUndefined();
  expect(condition.taskIds).toBeUndefined();
  expect(condition.sourceManifest).toBe("../../upstreams.json");
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dir, condition.sourceManifest), "utf8"));
  expect(condition.sources.map((source: { id: string }) => source.id).sort()).toEqual(Object.keys(manifest).sort());
  const roots: Record<string, string> = {
    ax: "src/ax/skills", expo: "plugins/expo/skills", pstack: "pstack/skills",
  };
  for (const source of condition.sources) {
    expect(manifest[source.id].revision).toMatch(/^[a-f0-9]{40}$/);
    expect(bundles).toContain(manifest[source.id].bundle ?? source.id);
    expect(source.root).toBe(roots[source.id] ?? "skills");
    expect(source.entries).toBe(source.id === "ax" ? "*.md" : "**/SKILL.md");
  }
});

test("defines 936 scheduled runs across the applicable conditions", () => {
  const taskConditions = config.conditions.reduce((total: number, condition: { taskIds?: string[] }) =>
    total + (condition.taskIds?.length ?? tasks.length), 0);
  expect(taskConditions * config.models.length * config.repeats).toBe(936);
});
