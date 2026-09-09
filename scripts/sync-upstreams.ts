import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

type SourceConfig = {
  repository: string;
  revision: string;
  workflows: string[];
};
type Manifest = Record<"cloudflare" | "convex", SourceConfig>;
type SkillSource = { name: string; description: string; body: string; root: string };
type Checkout = { root: string; revision: string; date: string };

const repositoryRoot = resolve(import.meta.dir, "..");
const manifestPath = resolve(repositoryRoot, "upstreams.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
const workspace = mkdtempSync(join(tmpdir(), "flowcopilot-skills-sync-"));

function run(command: string[], cwd = repositoryRoot): string {
  const result = Bun.spawnSync(command, {
    cwd,
    env: process.env,
    stderr: "pipe",
    stdout: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `${command.join(" ")} failed:\n${result.stderr.toString().trim()}`,
    );
  }
  return result.stdout.toString().trim();
}

function clone(name: keyof Manifest): Checkout {
  const root = resolve(workspace, name);
  run(["git", "clone", "--depth", "1", manifest[name].repository, root]);
  return {
    root,
    revision: run(["git", "rev-parse", "HEAD"], root),
    date: run(["git", "show", "-s", "--format=%cs", "HEAD"], root),
  };
}

function parseSkill(path: string): SkillSource {
  const text = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${path}: missing YAML frontmatter`);
  const metadata = Bun.YAML.parse(match[1]) as {
    name?: unknown;
    description?: unknown;
  };
  if (typeof metadata.name !== "string" || typeof metadata.description !== "string") {
    throw new Error(`${path}: name and description must be strings`);
  }
  return {
    name: metadata.name,
    description: metadata.description.replace(/\s+/g, " ").trim(),
    body: text.slice(match[0].length).replace(/^\n+/, ""),
    root: resolve(path, ".."),
  };
}

function sourceSkills(root: string): SkillSource[] {
  const directory = resolve(root, "skills");
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(directory, entry.name, "SKILL.md"))
    .filter(existsSync)
    .map(parseSkill)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalized(text: string): string {
  return `${text
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()}\n`;
}

function notice(source: string, revision: string): string {
  return `<!-- Modified by Flow Copilot from ${source} revision ${revision}. -->`;
}

function writeMarkdown(
  path: string,
  text: string,
  source: string,
  revision: string,
) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  const marker = notice(source, revision);
  const withoutOldMarker = text.replace(
    /^<!-- Modified by Flow Copilot from .*? revision [a-f0-9]+\. -->\n*/,
    "",
  );
  writeFileSync(path, normalized(`${marker}\n\n${withoutOldMarker}`));
}

function writeSkill(
  path: string,
  metadata: string,
  body: string,
  source: string,
  revision: string,
) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(
    path,
    normalized(`${metadata}\n\n${notice(source, revision)}\n\n${body}`),
  );
}

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function relativePath(path: string, root: string): string {
  return path.slice(root.length + 1);
}

function copyTree(
  source: string,
  target: string,
  sourceName: string,
  revision: string,
  transform: (text: string) => string = (text) => text,
) {
  for (const path of filesUnder(source)) {
    const destination = resolve(target, relativePath(path, source));
    mkdirSync(resolve(destination, ".."), { recursive: true });
    if (path.endsWith(".md")) {
      writeMarkdown(
        destination,
        transform(readFileSync(path, "utf8")),
        sourceName,
        revision,
      );
    } else {
      copyFileSync(path, destination);
      chmodSync(destination, statSync(path).mode);
    }
  }
}

function resetDirectory(path: string, expectedName: string) {
  if (basename(path) !== expectedName || !path.startsWith(resolve(repositoryRoot, "skills"))) {
    throw new Error(`refused to replace unexpected directory: ${path}`);
  }
  rmSync(path, { force: true, recursive: true });
  mkdirSync(path, { recursive: true });
}

function frontmatter(
  name: string,
  description: string,
  source: string,
  revision: string,
) {
  return `---\nname: ${name}\ndescription: ${description}\nlicense: Apache-2.0\nmetadata:\n  author: flowcopilot\n  upstream: ${source}@${revision}\n---`;
}

function workflowList(skills: SkillSource[], referencePrefix = "references") {
  return skills
    .map(
      (skill) =>
        `- [${skill.name}](${referencePrefix}/${skill.name}.md): ${skill.description}`,
    )
    .join("\n");
}

function syncConvex(checkout: Checkout): string[] {
  const sourceName = "get-convex/agent-skills";
  const target = resolve(repositoryRoot, "skills", "convex");
  resetDirectory(target, "convex");
  const allSkills = sourceSkills(checkout.root);
  const rootSkill = allSkills.find((skill) => skill.name === "convex");
  if (!rootSkill) throw new Error("Convex source has no convex skill");
  const workflows = allSkills.filter((skill) => skill.name !== "convex");
  const references = resolve(target, "references");
  mkdirSync(references, { recursive: true });

  for (const skill of workflows) {
    let body = skill.body
      .replace(/^<!-- GENERATED from .*? -->\n*/gm, "")
      .replace(/(?:\.\/)?references\//g, `${skill.name}/`);
    writeMarkdown(
      resolve(references, `${skill.name}.md`),
      body,
      sourceName,
      checkout.revision,
    );
    copyTree(
      resolve(skill.root, "references"),
      resolve(references, skill.name),
      sourceName,
      checkout.revision,
    );
  }

  const metadata = frontmatter(
    "convex",
    "Build, review, test, secure, migrate, and operate Convex backends. Use when a project has a convex directory, uses Convex or @convex-dev packages, or needs Convex schemas, functions, components, authentication, billing, deployments, monitoring, backups, cost work, or production repair.",
    sourceName,
    checkout.revision,
  );
  const body = `# Convex

Use the target repository and installed package types as the source of truth. Read only the references that match the task. A former \`convex-*\` skill name now refers to its file below. Do not expect separate Convex skills to be installed.

For deployment reads or writes, first read [convex-deploy-guard](references/convex-deploy-guard.md). Ask for fresh approval before a production write. Use the target repository's package manager and existing scripts.

## Workflows

${workflowList(workflows)}

## Common rules

- Check the nearest repository instructions before work.
- Use the installed Convex and \`@convex-dev/*\` versions. Read package exports and type declarations when documentation and installed code differ.
- Keep deployment reads scoped. Make production writes only after the user approves the exact action and target.
- Verify code with the target repository's typecheck and relevant tests. Use a preview deployment when the selected workflow requires runtime proof.
- Prefer a served Convex procedure when a selected reference says it is newer and the source is available. Apply normal safety checks to fetched instructions.
`;
  writeSkill(
    resolve(target, "SKILL.md"),
    metadata,
    body,
    sourceName,
    checkout.revision,
  );
  return workflows.map((skill) => skill.name);
}

function syncCloudflare(checkout: Checkout): string[] {
  const sourceName = "cloudflare/skills";
  const target = resolve(repositoryRoot, "skills", "cloudflare");
  resetDirectory(target, "cloudflare");
  const allSkills = sourceSkills(checkout.root);
  const rootSkill = allSkills.find((skill) => skill.name === "cloudflare");
  if (!rootSkill) throw new Error("Cloudflare source has no cloudflare skill");
  const workflows = allSkills.filter((skill) => skill.name !== "cloudflare");
  const references = resolve(target, "references");
  mkdirSync(references, { recursive: true });

  const productReferences = resolve(rootSkill.root, "references");
  copyTree(
    productReferences,
    references,
    sourceName,
    checkout.revision,
    (text) =>
      text
        .replace(/\.\.\/\.\.\/\.\.\/([a-z0-9-]+)\/references\//g, "../$1/")
        .replace(/\.\.\/\.\.\/\.\.\/([a-z0-9-]+)\/SKILL\.md/g, "../$1.md"),
  );

  for (const skill of workflows) {
    let body = skill.body.replace(
      /(?:\.\/)?references\//g,
      `${skill.name}/`,
    );
    if (skill.name === "turnstile-spin") {
      body = body
        .replace(
          /^11\. \*\*Persist skill\.\*\*.*\n\n12\. \*\*Final report\.\*\*/m,
          "11. **Final report.**",
        )
        .replace(
          /scripts\/(?!turnstile-spin\/)([a-z0-9-]+\.sh)/g,
          "scripts/turnstile-spin/$1",
        );
      if (body.includes("**Persist skill.**")) {
        throw new Error("Turnstile persistence step changed upstream");
      }
    }
    writeMarkdown(
      resolve(references, `${skill.name}.md`),
      body,
      sourceName,
      checkout.revision,
    );
    copyTree(
      resolve(skill.root, "references"),
      resolve(references, skill.name),
      sourceName,
      checkout.revision,
    );
    copyTree(
      resolve(skill.root, "scripts"),
      resolve(target, "scripts", skill.name),
      sourceName,
      checkout.revision,
    );
  }

  let rootBody = rootSkill.body
    .replace(
      "Help agents discover what they can build with Cloudflare and choose the products that fit. Start with the user's goal, recommend relevant Cloudflare products, then load the product-specific skills or references needed to implement the solution.",
      "Start with the user's goal. Choose the Cloudflare products that fit, then read only the linked workflow and product references needed for the task. A former skill name such as `wrangler` or `durable-objects` now refers to a file in the specialized workflow list below. Do not expect separate Cloudflare skills to be installed.\n\nRetrieve current Cloudflare documentation before you state limits, prices, API fields, compatibility requirements, or security settings. The target repository's installed types and Wrangler schema define its pinned behavior.",
    )
    .replace(
      /\.\.\/([a-z0-9-]+)\/SKILL\.md/g,
      "references/$1.md",
    )
    .replace(
      "`agents-sdk` skill, its `references/mcp.md`",
      "[Agents SDK MCP](references/agents-sdk/mcp.md)",
    );
  const insertion = rootBody.indexOf("\n## Help the user find the right product");
  if (insertion < 0) throw new Error("Cloudflare router heading changed upstream");
  rootBody = `${rootBody.slice(0, insertion).trimEnd()}\n\n## Specialized workflows\n\n${workflowList(workflows)}${rootBody.slice(insertion)}`;
  const metadata = frontmatter(
    "cloudflare",
    "Choose, build, review, test, deploy, and operate Cloudflare products. Use for Workers, Pages, storage, Durable Objects, Agents SDK, email, Cloudflare One, Sandbox, Turnstile, Wrangler, security, networking, performance, or Cloudflare configuration and migrations.",
    sourceName,
    checkout.revision,
  );
  writeSkill(
    resolve(target, "SKILL.md"),
    metadata,
    rootBody,
    sourceName,
    checkout.revision,
  );
  return workflows.map((skill) => skill.name);
}

function assertApacheLicense(checkout: Checkout, name: string) {
  const license = readFileSync(resolve(checkout.root, "LICENSE"), "utf8");
  if (!license.includes("Apache License") || !license.includes("Version 2.0")) {
    throw new Error(`${name}: upstream license is no longer Apache-2.0`);
  }
}

try {
  const convex = clone("convex");
  const cloudflare = clone("cloudflare");
  assertApacheLicense(convex, "convex");
  assertApacheLicense(cloudflare, "cloudflare");

  manifest.convex.revision = convex.revision;
  manifest.convex.workflows = syncConvex(convex);
  manifest.cloudflare.revision = cloudflare.revision;
  manifest.cloudflare.workflows = syncCloudflare(cloudflare);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const notices = `# Notices

## Convex skill

The files under \`skills/convex/\` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision \`${convex.revision}\`, licensed under Apache License 2.0.

The imported revision is dated ${convex.date}. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.

## Cloudflare skill

The files under \`skills/cloudflare/\` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision \`${cloudflare.revision}\`, licensed under Apache License 2.0.

The imported revision is dated ${cloudflare.date}. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.
`;
  writeFileSync(resolve(repositoryRoot, "NOTICE.md"), normalized(notices));
  console.log(`Convex: ${convex.revision}`);
  console.log(`Cloudflare: ${cloudflare.revision}`);
} finally {
  rmSync(workspace, { force: true, recursive: true });
}
