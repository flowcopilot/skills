import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

type Manifest = Record<
  string,
  { repository: string; revision: string; workflows: string[]; bundle?: string }
>;

const root = resolve(import.meta.dir, "..");
const skillsRoot = resolve(root, "skills");
const manifest = JSON.parse(
  readFileSync(resolve(root, "upstreams.json"), "utf8"),
) as Manifest;
const errors: string[] = [];

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function readSkill(path: string) {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${path}: missing YAML frontmatter`);
  const metadata = Bun.YAML.parse(match[1]) as Record<string, unknown>;
  return { metadata, text };
}

for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillRoot = resolve(skillsRoot, entry.name);
  const skillFiles = filesUnder(skillRoot).filter(
    (path) => path.endsWith("/SKILL.md"),
  );
  if (skillFiles.length !== 1) {
    errors.push(`${entry.name}: expected one SKILL.md, found ${skillFiles.length}`);
    continue;
  }

  try {
    const { metadata, text } = readSkill(skillFiles[0]);
    if (metadata.name !== entry.name) {
      errors.push(`${entry.name}: frontmatter name does not match the directory`);
    }
    if (
      typeof metadata.description !== "string" ||
      metadata.description.length < 1 ||
      metadata.description.length > 1024
    ) {
      errors.push(`${entry.name}: description must contain 1 to 1024 characters`);
    }
    if (text.split("\n").length > 500) {
      errors.push(`${entry.name}: SKILL.md exceeds 500 lines`);
    }
  } catch (error) {
    errors.push(String(error));
  }

}

for (const [skillName, source] of Object.entries(manifest)) {
  const skillRoot = resolve(skillsRoot, source.bundle ?? skillName);
  const router = readFileSync(resolve(skillRoot, "SKILL.md"), "utf8");
  for (const workflow of source.workflows) {
    const reference = resolve(skillRoot, "references", `${workflow}.md`);
    if (!existsSync(reference) || !statSync(reference).isFile()) {
      errors.push(`${skillName}: missing workflow reference ${workflow}.md`);
    }
    if (!router.includes(`references/${workflow}.md`)) {
      errors.push(`${skillName}: router does not link ${workflow}.md`);
    }
  }
}

const turnstile = resolve(skillsRoot, "cloudflare");
const turnstileText = readFileSync(
  resolve(turnstile, "references", "turnstile-spin.md"),
  "utf8",
);
for (const match of turnstileText.matchAll(
  /scripts\/turnstile-spin\/[a-z0-9-]+\.sh/g,
)) {
  const path = resolve(turnstile, match[0]);
  if (!existsSync(path)) errors.push(`cloudflare: missing script ${match[0]}`);
}

const expo = resolve(skillsRoot, "expo");
const expoSkill = readSkill(resolve(expo, "SKILL.md"));
if (expoSkill.metadata.license !== "MIT") errors.push("expo: expected MIT license metadata");
for (const path of ["LICENSE", "references/expo-animation/LICENSE"]) {
  const file = resolve(expo, path);
  if (!existsSync(file) || !readFileSync(file, "utf8").includes("Permission is hereby granted")) {
    errors.push(`expo: missing MIT license notice ${path}`);
  }
}
for (const file of filesUnder(expo).filter((path) => path.endsWith(".md"))) {
  const text = readFileSync(file, "utf8");
  if (!text.includes(`expo/skills revision ${manifest.expo.revision}`)) {
    errors.push(`expo: missing source revision in ${file}`);
  }
  for (const match of text.matchAll(/<skill-root>\/(scripts\/[a-z0-9-]+\/[a-z0-9_.-]+)/g)) {
    if (!existsSync(resolve(expo, match[1]))) errors.push(`expo: missing script ${match[1]}`);
  }
}

const reactNative = resolve(skillsRoot, "react-native");
if (readSkill(resolve(reactNative, "SKILL.md")).metadata.license !== "MIT") {
  errors.push("react-native: expected MIT license metadata");
}
for (const name of ["software-mansion", "callstack"]) {
  const source = manifest[name];
  if (source.bundle !== "react-native") errors.push(`${name}: expected react-native bundle`);
  const directory = resolve(reactNative, "references", name);
  const sourceName = source.repository.replace("https://github.com/", "").replace(/\.git$/, "");
  if (!source.workflows.includes(`${name}/react-native-best-practices/index`)) {
    errors.push(`${name}: missing distinct react-native-best-practices workflow`);
  }
  for (const file of filesUnder(directory).filter((path) => path.endsWith(".md"))) {
    if (!readFileSync(file, "utf8").includes(`${sourceName} revision ${source.revision}`)) {
      errors.push(`${name}: missing or incorrect source attribution in ${file}`);
    }
  }
  for (const workflow of source.workflows) {
    if (!workflow.startsWith(`${name}/`)) errors.push(`${name}: workflow escapes its source directory`);
  }
  const indexes = filesUnder(directory).filter((path) => path.endsWith("/index.md"));
  if (indexes.length !== source.workflows.length) errors.push(`${name}: workflow inventory mismatch`);
}
const mansionLicense = JSON.parse(readFileSync(resolve(reactNative, "licenses/software-mansion-marketplace.json"), "utf8"));
if (mansionLicense.plugins?.find((plugin: { name: string }) => plugin.name === "skills")?.license !== "MIT") {
  errors.push("software-mansion: missing upstream MIT declaration");
}
if (!readFileSync(resolve(reactNative, "licenses/callstack-LICENSE"), "utf8").includes("Copyright (c) 2026 Callstack Incubator")) {
  errors.push("callstack: missing upstream copyright notice");
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log("All skill structures, routes, and bundled scripts are valid.");
