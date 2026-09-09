import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

type Manifest = Record<
  string,
  { repository: string; revision: string; workflows: string[] }
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

  for (const source of filesUnder(skillRoot).filter((path) => path.endsWith(".md"))) {
    const text = readFileSync(source, "utf8");
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1].split("#", 1)[0];
      if (
        !link ||
        link.includes("://") ||
        link.startsWith("mailto:") ||
        link.startsWith("#") ||
        link.startsWith("<")
      ) {
        continue;
      }
      const target = resolve(source, "..", decodeURIComponent(link));
      if (!existsSync(target)) errors.push(`${source}: missing link target ${link}`);
    }
  }
}

for (const [skillName, source] of Object.entries(manifest)) {
  const skillRoot = resolve(skillsRoot, skillName);
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

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log("All skill structures, routes, links, and bundled scripts are valid.");
