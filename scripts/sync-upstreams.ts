import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  lstatSync,
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
  bundle?: string;
};
type Manifest = Record<"ax" | "cloudflare" | "convex" | "expo" | "software-mansion" | "callstack" | "clerk" | "emil-kowalski" | "jakub-krehel" | "pstack" | "matt-pocock" | "agent-browser" | "agent-device" | "agent-desktop", SourceConfig>;
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

function sourceMarkdownSkills(directory: string): SkillSource[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => parseSkill(resolve(directory, entry.name)))
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

function patchGeneratedFile(path: string, changes: [string, string][]) {
  let text = readFileSync(path, "utf8");
  for (const [from, to] of changes) {
    if (!text.includes(from)) throw new Error(`${path}: upstream text changed: ${from}`);
    text = text.replaceAll(from, to);
  }
  writeFileSync(path, text);
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

// Upstream trees must not contain symlinks: reading or copying one would import a file from outside the checkout.
function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  if (lstatSync(directory).isSymbolicLink()) throw new Error(`refused to follow symlink: ${directory}`);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`refused to follow symlink: ${path}`);
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
  extraMetadata: Record<string, string> = {},
  license = "Apache-2.0",
) {
  const metadata = Object.entries(extraMetadata)
    .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `---\nname: ${name}\ndescription: ${description}\nlicense: ${license}\nmetadata:\n  author: flowcopilot\n  upstream: ${source}@${revision}${metadata ? `\n${metadata}` : ""}\n---`;
}

function workflowList(skills: SkillSource[], referencePrefix = "references") {
  return skills
    .map(
      (skill) =>
        `- [${skill.name}](${referencePrefix}/${skill.name}.md): ${skill.description}`,
    )
    .join("\n");
}

function syncAx(checkout: Checkout): string[] {
  const sourceName = "ax-llm/ax";
  const target = resolve(repositoryRoot, "skills", "ax");
  resetDirectory(target, "ax");
  const version = JSON.parse(
    readFileSync(resolve(checkout.root, "src", "ax", "package.json"), "utf8"),
  ).version as unknown;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("Ax package version is missing");
  }
  const sourceRoot = resolve(checkout.root, "src", "ax", "skills");
  const workflows = sourceMarkdownSkills(sourceRoot);
  if (!workflows.some((skill) => skill.name === "ax-llm")) {
    throw new Error("Ax source has no ax-llm skill");
  }

  const references = resolve(target, "references");
  mkdirSync(references, { recursive: true });
  // Ax keeps files that several skills share in references/; they move to references/shared/.
  for (const skill of workflows) {
    writeMarkdown(
      resolve(references, `${skill.name}.md`),
      skill.body
        .replaceAll("__VERSION__", version)
        .replace(/\]\((?:\.\/)?references\//g, "](shared/"),
      sourceName,
      checkout.revision,
    );
  }
  copyTree(
    resolve(sourceRoot, "references"),
    resolve(references, "shared"),
    sourceName,
    checkout.revision,
    (text) => text.replaceAll("__VERSION__", version),
  );

  const metadata = frontmatter(
    "ax",
    "Load this skill before you read or change code in a project whose package.json lists @ax-llm/ax. Covers signatures, structured generation, agents, model providers, MCP, flows, optimization, and refinement.",
    sourceName,
    checkout.revision,
    { upstream_version: version },
  );
  const body = `# Ax

Use the installed \`@ax-llm/ax\` package and its types as the source of truth. Read only the references that match the task. A former \`ax-*\` skill name now refers to its file below. Do not expect separate Ax skills to be installed.

## Workflows

${workflowList(workflows)}

## Common rules

- Prefer the factory APIs used by the selected reference.
- Match examples to the installed package version. Check package exports and type declarations when they differ from a reference.
- Load more than one reference when a task crosses Ax subsystems. For example, an agent with MCP tools needs both the agent and MCP references.
- Verify code with the target repository's typecheck and relevant tests.
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
    "Load this skill before you read or change code in a project that has a convex directory or whose package.json lists convex or @convex-dev packages. Covers schemas, queries, mutations, actions, indexes, crons, auth, components, migrations, and deployments.",
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
  const workflowNames = new Set(workflows.map((skill) => skill.name));
  // Former sibling skill names are not installable skills here; link their references instead.
  const linkWorkflowMentions = (text: string, prefix: string) =>
    text
      .replace(/\[([a-z0-9-]+) skill\]\(/g, (match, name: string) =>
        workflowNames.has(name) ? `[${name}](` : match)
      .replace(/`([a-z0-9-]+)` skill\b/g, (match, name: string) =>
        workflowNames.has(name) ? `[${name}](${prefix}${name}.md) reference` : match);
  const replaceExact = (text: string, from: string, to: string) => {
    if (!text.includes(from)) throw new Error(`Cloudflare text changed upstream: ${from}`);
    return text.replace(from, to);
  };
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
    let body = linkWorkflowMentions(
      skill.body
        .replace(/(?:\.\/)?references\//g, `${skill.name}/`)
        // Sibling skill links point to references next to this one, and the root skill to the router.
        .replace(/\.\.\/cloudflare\/SKILL\.md/g, "../SKILL.md")
        .replace(/\.\.\/([a-z0-9-]+)\/SKILL\.md/g, (match, name: string) =>
          workflowNames.has(name) ? `${name}.md` : match),
      "",
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
  rootBody = linkWorkflowMentions(rootBody, "references/");
  rootBody = replaceExact(
    rootBody,
    "`sandbox-next` for new or preview projects; `sandbox-stable` for existing stable apps",
    "[sandbox-next](references/sandbox-next.md) for new or preview projects; [sandbox-stable](references/sandbox-stable.md) for existing stable apps",
  );
  rootBody = replaceExact(
    rootBody,
    "then load the relevant skills or documentation for implementation",
    "then read the relevant references or documentation for implementation",
  );
  rootBody = replaceExact(
    rootBody,
    "Read the linked reference or docs before implementing; load named skills when installed.",
    "Read the linked reference or docs before implementing.",
  );
  rootBody = replaceExact(
    rootBody,
    "If a named skill is unavailable, use the relevant product docs through the [Cloudflare directory](https://developers.cloudflare.com/directory/index.md); sibling skills are optional.",
    "If no bundled reference covers the product, use the relevant product docs through the [Cloudflare directory](https://developers.cloudflare.com/directory/index.md).",
  );
  rootBody = replaceExact(rootBody, "| Skill or reference |", "| Reference |");
  const staleMention = rootBody.match(/`([a-z0-9-]+)` skill|named skill/);
  if (staleMention) throw new Error(`Cloudflare router still names a skill: ${staleMention[0]}`);
  const insertion = rootBody.indexOf("\n## Help the user find the right product");
  if (insertion < 0) throw new Error("Cloudflare router heading changed upstream");
  rootBody = `${rootBody.slice(0, insertion).trimEnd()}\n\n## Specialized workflows\n\n${workflowList(workflows)}${rootBody.slice(insertion)}`;
  const metadata = frontmatter(
    "cloudflare",
    "Load this skill before you read or change code in a Cloudflare Workers or Pages project, such as one with a wrangler config or a wrangler dependency, or when the task names a Cloudflare product. Covers Workers, Pages, D1, KV, R2, Queues, Durable Objects, the Agents SDK, Wrangler, security, and networking.",
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

function syncExpo(checkout: Checkout): string[] {
  const sourceName = "expo/skills";
  const plugin = resolve(checkout.root, "plugins", "expo");
  const workflows = sourceSkills(plugin);
  const names = new Set(workflows.map((skill) => skill.name));
  const readme = readFileSync(resolve(plugin, "skills", "README.md"), "utf8");
  const index = readme.match(/## Start Here\n([\s\S]*?)\n## Adding a skill/);
  if (!index || !names.has("expo-overview")) {
    throw new Error("Expo README index or overview changed upstream");
  }
  const indexed = new Set<string>();
  const routes = (`## Start Here\n${index[1]}`).replace(
    /^\| `([a-z0-9-]+)` \|/gm,
    (_, name: string) => {
      if (!names.has(name) || indexed.has(name)) {
        throw new Error(`Expo index contains an unknown or duplicate skill: ${name}`);
      }
      indexed.add(name);
      return `| [${name}](references/${name}.md) |`;
    },
  );
  for (const name of names) {
    if (!indexed.has(name)) throw new Error(`Expo index is missing ${name}`);
  }
  const license = readFileSync(resolve(checkout.root, "LICENSE"), "utf8");
  if (!license.includes("The MIT License (MIT)") ||
      !license.includes("Permission is hereby granted, free of charge") ||
      !license.includes("650 Industries")) {
    throw new Error("Expo upstream license changed");
  }
  const target = resolve(repositoryRoot, "skills", "expo");
  resetDirectory(target, "expo");
  copyFileSync(resolve(checkout.root, "LICENSE"), resolve(target, "LICENSE"));

  for (const skill of workflows) {
    const supportingFiles = readdirSync(skill.root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name !== "SKILL.md");
    const transform = (text: string) => text
      .replaceAll(`plugins/expo/skills/${skill.name}/SKILL.md`, `references/${skill.name}.md`)
      .replaceAll("../SKILL.md", `../${skill.name}.md`)
      .replace(/<skill-(?:dir|root)>\/scripts\//g, `<skill-root>/scripts/${skill.name}/`)
      .replaceAll("${CLAUDE_PLUGIN_ROOT}/skills/expo-skill-feedback/scripts/", "<skill-root>/scripts/expo-skill-feedback/");
    let body = transform(skill.body)
      .replace(/(?:\.\/)?references\//g, `${skill.name}/`);
    for (const entry of supportingFiles) {
      body = body.replaceAll(entry.name, `${skill.name}/${entry.name}`);
    }
    writeMarkdown(resolve(target, "references", `${skill.name}.md`), body, sourceName, checkout.revision);
    patchGeneratedFile(resolve(target, "references", `${skill.name}.md`), [[
      `npx --yes @expo/agent-cli@latest feedback --category skills --subject "${skill.name}" "<actionable feedback>"`,
      `npx --yes @expo/agent-cli@latest feedback --category skills --subject "${skill.name}" --message "<actionable feedback>"`,
    ]]);
    copyTree(resolve(skill.root, "references"), resolve(target, "references", skill.name), sourceName, checkout.revision, transform);
    copyTree(resolve(skill.root, "scripts"), resolve(target, "scripts", skill.name), sourceName, checkout.revision);
    for (const entry of supportingFiles) {
      const destination = resolve(target, "references", skill.name, entry.name);
      mkdirSync(resolve(destination, ".."), { recursive: true });
      if (entry.name.endsWith(".md")) {
        writeMarkdown(destination, transform(readFileSync(resolve(skill.root, entry.name), "utf8")), sourceName, checkout.revision);
      } else {
        copyFileSync(resolve(skill.root, entry.name), destination);
      }
    }
  }
  patchGeneratedFile(resolve(target, "references/eas-observe/library-integrations.md"), [
    ["Their reports are user-defined events and errors", "Their reports are SDK and integration events and errors"],
  ]);
  patchGeneratedFile(resolve(target, "references/eas-observe/queries.md"), [[
    "https://docs.expo.dev/eas/observe/mcp/", "https://docs.expo.dev/eas/ai/mcp/",
  ]]);
  writeSkill(resolve(target, "SKILL.md"), frontmatter(
    "expo",
    "Load this skill before you read or change code in a project whose package.json lists expo, or when the task names Expo or EAS. Covers routes and navigation, data fetching, native UI, native modules, SDK upgrades, EAS builds, hosting, and OTA updates.",
    sourceName, checkout.revision, {}, "MIT",
  ), `# Expo

Read [expo-overview](references/expo-overview.md) for shared setup rules, then load the references that match the user's goal. Expo documentation and the installed Expo and EAS CLIs are the source of truth.

Former Expo and EAS skill names refer to the workflow files below. Load those references when an imported instruction asks for another skill or its SKILL.md. Paths in workflow references are relative to that reference; \`<skill-root>\` means this combined expo directory. The upstream overview mentions expo-tailwind-setup, which is not present in this source collection; consult current Expo documentation for that topic.

This package contains skill instructions and helper scripts. Plugin MCP configuration and telemetry hooks are not installed by this package.

${routes}
`, sourceName, checkout.revision);
  return workflows.map((skill) => skill.name);
}

const reactNativeSources = ["software-mansion", "callstack"] as const;
const designEngineeringSources = ["emil-kowalski", "jakub-krehel"] as const;
const claritySources = ["pstack", "matt-pocock"] as const;
const agentSurfSources = ["agent-browser", "agent-device", "agent-desktop"] as const;
type TreeSource =
  | typeof reactNativeSources[number]
  | typeof designEngineeringSources[number]
  | typeof claritySources[number]
  | typeof agentSurfSources[number];

// Multi-source bundles keep each source's skills/ tree and rename entry files to index.md.
// `include` limits the import to the named top-level skill directories.
function readSkillTree(name: TreeSource, checkout: Checkout, root = "skills", include?: string[]) {
  const sourceRoot = resolve(checkout.root, root);
  const files = filesUnder(sourceRoot).filter((path) => {
    const parts = relativePath(path, sourceRoot).split("/");
    return !parts.includes("agents") && (!include || include.includes(parts[0]));
  });
  const skills = files.filter((path) => basename(path) === "SKILL.md").map((path) => ({
    ...parseSkill(path),
    path: relativePath(path, sourceRoot).replace(/SKILL\.md$/, "index.md"),
  })).sort((a, b) => a.path.localeCompare(b.path));
  // A source must never overwrite its own index or another source's files.
  const destinations = files.map((path) => relativePath(path, sourceRoot).replace(/(^|\/)SKILL\.md$/, "$1index.md"));
  if (new Set(destinations).size !== destinations.length) {
    throw new Error(`${name}: SKILL.md to index.md collision`);
  }
  return { name, checkout, sourceRoot, files, skills };
}

function writeSkillTree(
  { name, checkout, sourceRoot, files, skills }: ReturnType<typeof readSkillTree>,
  bundle: string,
): string {
  const target = resolve(repositoryRoot, "skills", bundle);
  const sourceName = manifest[name].repository.replace("https://github.com/", "").replace(/\.git$/, "");
  for (const path of files) {
    const relative = relativePath(path, sourceRoot).replace(/(^|\/)SKILL\.md$/, "$1index.md");
    const destination = resolve(target, "references", name, relative);
    mkdirSync(resolve(destination, ".."), { recursive: true });
    if (path.endsWith(".md")) {
      const body = basename(path) === "SKILL.md" ? parseSkill(path).body : readFileSync(path, "utf8");
      // Preserve each source tree. Only local skill entry filenames change.
      // External URLs continue to address the original upstream SKILL.md.
      const rewritten = body.replace(/https?:\/\/[^\s<>\)]+|\bSKILL\.md\b/g,
        (match) => match.startsWith("http") ? match : "index.md");
      writeMarkdown(destination, rewritten, sourceName, checkout.revision);
    } else {
      copyFileSync(path, destination);
      chmodSync(destination, statSync(path).mode);
    }
  }
  manifest[name].bundle = bundle;
  manifest[name].revision = checkout.revision;
  manifest[name].workflows = skills.map((skill) => `${name}/${skill.path.replace(/\.md$/, "")}`);
  return sourceName;
}

function skillRoutes(name: TreeSource, skills: ReturnType<typeof readSkillTree>["skills"]): string {
  return skills.map((skill) => {
    const description = skill.description.split(/\.\s/)[0].replace(/\s+/g, " ").replace(/\.$/, "");
    return `- [${skill.name}](references/${name}/${skill.path}): ${description}.`;
  }).join("\n");
}

function syncReactNative(checkouts: Record<typeof reactNativeSources[number], Checkout>): string {
  const bundle = "react-native";
  const target = resolve(repositoryRoot, "skills", bundle);
  const imports = reactNativeSources.map((name) => {
    const tree = readSkillTree(name, checkouts[name]);
    if (!tree.skills.some((skill) => skill.path === "react-native-best-practices/index.md")) {
      throw new Error(`${name}: missing react-native-best-practices skill`);
    }
    if (name === "software-mansion") {
      const metadata = JSON.parse(readFileSync(resolve(tree.checkout.root, ".claude-plugin", "marketplace.json"), "utf8"));
      const plugin = metadata.plugins?.find((plugin: { name: string }) => plugin.name === "skills");
      if (plugin?.license !== "MIT") throw new Error("Software Mansion plugin license changed");
    } else {
      const license = readFileSync(resolve(tree.checkout.root, "LICENSE"), "utf8");
      if (!license.includes("MIT License") || !license.includes("Permission is hereby granted")) {
        throw new Error("Callstack license changed");
      }
    }
    return tree;
  });
  resetDirectory(target, bundle);
  const sections: string[] = [];
  const notices: string[] = [];
  mkdirSync(resolve(target, "licenses"), { recursive: true });
  for (const tree of imports) {
    const { name, checkout, skills } = tree;
    const sourceName = writeSkillTree(tree, bundle);
    const label = name === "software-mansion" ? "Software Mansion" : "Callstack";
    sections.push(`## ${label}\n\n${skillRoutes(name, skills)}`);
    const licenseFile = name === "software-mansion" ? "software-mansion-marketplace.json" : "callstack-LICENSE";
    copyFileSync(resolve(checkout.root, name === "software-mansion" ? ".claude-plugin/marketplace.json" : "LICENSE"), resolve(target, "licenses", licenseFile));
    notices.push(`### ${label}\n\nImported from [${sourceName}](https://github.com/${sourceName}) revision \`${checkout.revision}\`, dated ${checkout.date}. ${name === "software-mansion" ? "The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained" : "The upstream MIT license and copyright notice are retained"} in \`skills/${bundle}/licenses/${licenseFile}\`.`);
  }
  const first = checkouts["software-mansion"];
  writeSkill(resolve(target, "SKILL.md"), frontmatter(bundle,
    "Load this skill before you read or change code in a project whose package.json lists react-native. Covers crashes, slow screens and long lists, animations and gestures with Reanimated or Gesture Handler, native modules, navigation, and upgrades.",
    "software-mansion-labs/skills", first.revision,
    { upstream_callstack: `callstackincubator/agent-skills@${checkouts.callstack.revision}` }, "MIT"),
    `# React Native

Use the target project's installed versions and the user's task to select references. Read only the relevant workflow and its supporting files.

## Choose a source

- For animations, gestures, audio, on-device AI, rich text, JSI, and worklets, start with [Software Mansion's best practices](references/software-mansion/react-native-best-practices/index.md).
- For profiling, rendering, startup time, memory, and bundle size, start with [Callstack's best practices](references/callstack/react-native-best-practices/index.md).
- For navigation, upgrades, TV, library creation, CI, or migration, select the matching Callstack workflow below.
- For Software Mansion libraries and tools, select the matching Software Mansion workflow below. These workflows can also cover web or native platforms; apply only the parts relevant to the task.

Both upstream skills named react-native-best-practices are preserved. Their source directories prevent filename collisions. A request to read an upstream skill means its index.md reference in the same source directory. Relative paths remain relative to the imported file. When advice overlaps, use the guidance that matches the installed library and version; resolve conflicting claims against current official documentation.

This bundle imports the skills directories of both repositories, including nested skills. Plugin configuration and externally hosted skills linked by upstream READMEs are not included.

${sections.join("\n\n")}
`, "software-mansion-labs/skills", first.revision);
  return `## React Native skill\n\nFlow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links.\n\n${notices.join("\n\n")}\n`;
}

const designEngineeringLabels: Record<typeof designEngineeringSources[number], string> = {
  "emil-kowalski": "Emil Kowalski",
  "jakub-krehel": "Jakub Krehel",
};

function syncDesignEngineering(checkouts: Record<typeof designEngineeringSources[number], Checkout>): string {
  const bundle = "design-engineering";
  const target = resolve(repositoryRoot, "skills", bundle);
  const imports = designEngineeringSources.map((name) => {
    const tree = readSkillTree(name, checkouts[name]);
    const license = readFileSync(resolve(tree.checkout.root, "LICENSE"), "utf8");
    if (!license.includes("MIT License") || !license.includes("Permission is hereby granted") ||
        !license.includes(`Copyright (c) 2026 ${designEngineeringLabels[name]}`)) {
      throw new Error(`${name}: upstream license changed`);
    }
    // Both sources keep one flat directory per skill; nested skills need router changes.
    const nested = tree.skills.find((skill) => skill.path.split("/").length !== 2);
    if (nested) throw new Error(`${name}: unexpected nested skill ${nested.path}`);
    return tree;
  });
  resetDirectory(target, bundle);
  const sections: string[] = [];
  const notices: string[] = [];
  mkdirSync(resolve(target, "licenses"), { recursive: true });
  for (const tree of imports) {
    const { name, checkout, skills } = tree;
    const sourceName = writeSkillTree(tree, bundle);
    const label = designEngineeringLabels[name];
    // Upstream disable-model-invocation skills run only on an explicit user request.
    const explicit = skills.filter((skill) =>
      /^disable-model-invocation: true$/m.test(readFileSync(resolve(tree.sourceRoot, skill.path.replace(/index\.md$/, "SKILL.md")), "utf8")));
    const automatic = skills.filter((skill) => !explicit.includes(skill));
    sections.push(`## ${label}\n\n${skillRoutes(name, automatic)}\n\nOnly when the user explicitly asks for them by name or purpose:\n\n${skillRoutes(name, explicit)}`);
    const licenseFile = `${name}-LICENSE`;
    copyFileSync(resolve(checkout.root, "LICENSE"), resolve(target, "licenses", licenseFile));
    notices.push(`### ${label}\n\nImported from [${sourceName}](https://github.com/${sourceName}) revision \`${checkout.revision}\`, dated ${checkout.date}. The upstream MIT license and copyright notice are retained in \`skills/${bundle}/licenses/${licenseFile}\`.`);
  }
  const teardown = resolve(target, "references/jakub-krehel/teardown");
  patchGeneratedFile(resolve(teardown, "geometry-library.md"), [[
    "```js\nconst disc = (cx, r) =>", "```js\nconst lever = G.part('lever', 'Lever');\nconst disc = (cx, r) =>",
  ]]);
  patchGeneratedFile(resolve(teardown, "scripts/config.cjs"), [[
    "      parts.add(p.id);\n    }\n    const keys = new Set();",
    `      parts.add(p.id);
    }
    for (const hue of Object.values(d.colors?.hues ?? {})) {
      if (!Number.isFinite(hue) || hue < 0 || hue > 360) throw Error('Color hues must be finite numbers from 0 to 360');
    }
    if (d.colors?.fills !== undefined) {
      if (!Array.isArray(d.colors.fills)) throw Error('Color fills must be an array');
      d.colors.fills = d.colors.fills.map(String);
      if (!d.colors.fills.every(id => parts.has(id))) throw Error('Color fills must reference existing part IDs');
    }
    const keys = new Set();`,
  ]]);
  patchGeneratedFile(resolve(teardown, "scripts/test-viewer-builder.cjs"), [[
    "  config.drawings[0].initialView = 'assembled';",
    `  config.drawings[0].parts = [{id: 1, name: 'One'}];
  config.drawings[0].colors = {hues: {'1': 250}, fills: [1]};
  fs.writeFileSync(configPath, JSON.stringify(config));
  build(configPath, output);
  const coloredHtml = fs.readFileSync(output, 'utf8');
  const coloredData = JSON.parse(coloredHtml.match(/<script[^>]*id="drawing-data"[^>]*>([\\s\\S]*?)<\\/script>/)[1]);
  assert.equal(coloredData[0].parts[0].id, '1');
  assert.deepEqual(coloredData[0].colors, {hues: {'1': 250}, fills: ['1']});
  for (const hue of [0, 360]) {
    config.drawings[0].colors = {hues: {'1': hue}};
    fs.writeFileSync(configPath, JSON.stringify(config));
    assert.doesNotThrow(() => build(configPath, output));
  }
  for (const hue of ['blue', null, true, -1, 361, 1e308]) {
    config.drawings[0].colors = {hues: {'1': hue}};
    fs.writeFileSync(configPath, JSON.stringify(config));
    assert.throws(() => build(configPath, output), /Color hues must be finite numbers from 0 to 360/);
  }
  config.drawings[0].colors = {fills: ['missing']};
  fs.writeFileSync(configPath, JSON.stringify(config));
  assert.throws(() => build(configPath, output), /Color fills must reference existing part IDs/);
  config.drawings[0].colors = {fills: '1'};
  fs.writeFileSync(configPath, JSON.stringify(config));
  assert.throws(() => build(configPath, output), /Color fills must be an array/);
  delete config.drawings[0].colors;
  config.drawings[0].initialView = 'assembled';`,
  ]]);
  const first = checkouts["emil-kowalski"];
  writeSkill(resolve(target, "SKILL.md"), frontmatter(bundle,
    "Load this skill before you build, change, or review UI components in a web or React Native app. Covers forms and accessibility, toasts and notifications, animation and motion, typography, color, layout, and product copy.",
    "emilkowalski/skills", first.revision,
    { upstream_jakub_krehel: `jakubkrehel/skills@${checkouts["jakub-krehel"].revision}` }, "MIT"),
    `# Design Engineering

Use the target project's stack, design tokens, and installed libraries to select references. Read only the relevant workflow and its supporting files.

## Choose a source

- For motion — building, reviewing, auditing, or naming animations, gestures, and transitions on the web or in Expo — start with Emil Kowalski's workflows. [emil-design-eng](references/emil-kowalski/emil-design-eng/index.md) holds the shared philosophy.
- For static interface quality — UI polish, typography, color, layout, accessibility, and product copy — use the matching Jakub Krehel \`better-*\` workflow. [better-interface](references/jakub-krehel/better-interface/index.md) combines them into one review.
- When both sources cover a topic, such as animation in \`better-ui\` or typography in \`apple-design\`, prefer the source whose focus matches the task and keep the project's existing tokens.

A former upstream skill name, such as \`review-animations\` or \`better-colors\`, now refers to its index.md reference in the same source directory. Those workflows are available whenever this skill is installed; load them when an imported instruction asks for another skill. Relative paths remain relative to the imported file.

Upstream instructions that describe a first response for an invocation without a question apply when the user selected that workflow explicitly. Workflows listed as explicit-only were user-invoked upstream; do not start them unprompted.

This bundle imports the skills directories of both repositories. Plugin metadata, agent UI metadata, and root-level files are not included.

${sections.join("\n\n")}
`, "emilkowalski/skills", first.revision);
  return `## Design Engineering skill\n\nFlow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, groups user-invoked skills in the router, preserves source-specific directories and supporting files, and adjusts local entry-file links. It also initializes the teardown extrusion example and validates teardown color settings, with regression coverage in the viewer builder test.\n\n${notices.join("\n\n")}\n`;
}

// Clarity imports selected skills. `userOnly` records the upstream invocation
// (Claude `disable-model-invocation`, Codex `policy.allow_implicit_invocation`).
// The router sets the Flow Copilot policy; a changed upstream flag stops the sync for review.
const clarityImports = {
  pstack: {
    label: "pstack",
    holder: "Lauren Tan",
    root: "pstack/skills",
    skills: { unslop: { userOnly: true }, "technical-writing": { userOnly: true } },
  },
  "matt-pocock": {
    label: "Matt Pocock",
    holder: "Matt Pocock",
    root: "skills/productivity",
    skills: { "writing-for-agents": { userOnly: false } },
  },
} satisfies Record<typeof claritySources[number], {
  label: string;
  holder: string;
  root: string;
  skills: Record<string, { userOnly: boolean }>;
}>;

function upstreamUserOnly(skillRoot: string): boolean {
  const flag = /^disable-model-invocation: true$/m.test(readFileSync(resolve(skillRoot, "SKILL.md"), "utf8"));
  const codexPath = resolve(skillRoot, "agents", "openai.yaml");
  if (existsSync(codexPath)) {
    const codex = Bun.YAML.parse(readFileSync(codexPath, "utf8")) as { policy?: { allow_implicit_invocation?: boolean } };
    if ((codex.policy?.allow_implicit_invocation === false) !== flag) {
      throw new Error(`${skillRoot}: Claude and Codex invocation flags disagree`);
    }
  }
  return flag;
}

// Reply rules are local so upstream sync cannot restore the longer chat format.
function clarityCommentRules(checkout: Checkout): string {
  const body = parseSkill(resolve(checkout.root, "pstack/skills/poteto-mode/SKILL.md")).body;
  const section = body.match(/^## Comments\n[\s\S]*?(?=^## Playbooks\n)/m)?.[0];
  if (!section?.trim().startsWith("## Comments\n\nComments follow the same rule as the reply.")) {
    throw new Error("pstack: poteto-mode comment rules changed");
  }
  return section.trim();
}

function syncClarity(checkouts: Record<typeof claritySources[number], Checkout>): string {
  const bundle = "clarity";
  const target = resolve(repositoryRoot, "skills", bundle);
  const imports = claritySources.map((name) => {
    const { root, holder, skills } = clarityImports[name];
    const checkout = checkouts[name];
    const tree = readSkillTree(name, checkout, root, Object.keys(skills));
    for (const [skill, { userOnly }] of Object.entries(skills)) {
      if (!tree.skills.some((source) => source.path === `${skill}/index.md`)) {
        throw new Error(`${name}: missing ${skill} skill`);
      }
      if (upstreamUserOnly(resolve(tree.sourceRoot, skill)) !== userOnly) {
        throw new Error(`${name}: ${skill} changed its upstream invocation policy`);
      }
    }
    const license = readFileSync(resolve(checkout.root, name === "pstack" ? "pstack/LICENSE" : "LICENSE"), "utf8");
    if (!license.includes("MIT License") || !license.includes("Permission is hereby granted") ||
        !license.includes(`Copyright (c) 2026 ${holder}`)) {
      throw new Error(`${name}: upstream license changed`);
    }
    return tree;
  });
  const pstack = checkouts.pstack;
  if (!existsSync(resolve(pstack.root, "pstack/skills/figure-it-out/SKILL.md"))) {
    throw new Error("pstack: figure-it-out skill removed");
  }
  const commentRules = clarityCommentRules(pstack);

  resetDirectory(target, bundle);
  const notices: string[] = [];
  mkdirSync(resolve(target, "licenses"), { recursive: true });
  for (const tree of imports) {
    const { name, checkout } = tree;
    const sourceName = writeSkillTree(tree, bundle);
    const { label, root } = clarityImports[name];
    const licenseFile = `${name}-LICENSE`;
    copyFileSync(resolve(checkout.root, name === "pstack" ? "pstack/LICENSE" : "LICENSE"), resolve(target, "licenses", licenseFile));
    notices.push(`### ${label}\n\nImported from [${sourceName}](https://github.com/${sourceName}) revision \`${checkout.revision}\`, dated ${checkout.date}. It imports the ${new Intl.ListFormat("en", { type: "conjunction" }).format(Object.keys(clarityImports[name].skills).map((skill) => `\`${skill}\``))} skills from \`${root}/\`. The upstream MIT license and copyright notice are retained in \`skills/${bundle}/licenses/${licenseFile}\`.`);
  }

  mkdirSync(resolve(target, "agents"), { recursive: true });
  writeFileSync(resolve(target, "agents", "openai.yaml"), `interface:
  display_name: "Clarity"
  short_description: "Write clearly for people and agents"
policy:
  allow_implicit_invocation: true
`);
  writeFileSync(resolve(target, "references", "figure-it-out.md"), normalized(`<!-- Flow Copilot text based on ideas from cursor/plugins pstack/skills/figure-it-out revision ${pstack.revision}. -->

# Figure it out

Use this workflow when the user says "figure it out yourself", or hands off a large task to finish without them. Design the plan first. Then run it as a series of experiments.

1. Write the done condition before you start. It must be a check that can fail: a command, a test, or a value in the real artifact.
2. Set the amount of checking from the risk. A change that cannot be undone, or that touches many parts, gets more checks. A small change that you can revert gets fewer.
3. Split the work into small units that each end in a state you can check. Do the most uncertain unit first. Build the check before the work, and record its value before the change.
4. For each unit, state a hypothesis, make the smallest change, and measure the result on the real artifact. Keep the change when it moves toward the done condition. Revert it when it does not.
5. Give each check one verdict: VERIFIED, NOT VERIFIED, or INCONCLUSIVE. INCONCLUSIVE is not a pass. Read the artifact, not the report of a worker. When a check passes too easily, examine the check before the system.
6. At the end, send the result and the done condition to the adversarial role in the Clarity model roles. That reviewer attacks the work against the done condition.
7. Reply with the plan, the risk level and its reason, the decisions you made, what is verified, and what is still open.

Units with defined steps go to the investigation role. The parent session keeps the plan and the verdicts.
`));

  writeSkill(resolve(target, "SKILL.md"), frontmatter(bundle,
    "Load this skill before you write or rewrite prose for people or agents, such as docs, READMEs, announcements, PR descriptions, commit messages, product copy, skills, AGENTS.md, or CLAUDE.md, or before you explain how or why code works. Also load it when the user says to figure it out yourself. Covers plain-language rules, technical writing, writing for agents, and explanations of how code works. Do not load it for code-only changes.",
    "cursor/plugins", pstack.revision,
    { upstream_matt_pocock: `mattpocock/skills@${checkouts["matt-pocock"].revision}` }, "MIT"),
    `# Clarity

Write every text so that its reader understands it on the first read. Answer how and why questions with evidence. Read only the references that the task needs.

## Pick the rules by reader

- Prose that a person reads: chat replies, PR bodies, commit messages, docs, issues, code comments, and product or marketing copy. Read [unslop](references/pstack/unslop/index.md) before you write the first sentence, and again when its rules are no longer in your context. Write the prose clean as you draft, to the unslop rules and the reply rules below.
- Technical text that a person reads: apply [technical-writing](references/pstack/technical-writing/index.md) to docs, READMEs, RFCs, PR descriptions, and commit messages. For technical explanations in chat, apply its sentence rules and use the reply rules below to choose length and structure.
- Text that an agent reads: skills, \`AGENTS.md\`, \`CLAUDE.md\`, files under \`docs/agents/\`, and prompts for subagents. Apply [writing-for-agents](references/matt-pocock/writing-for-agents/index.md) and the sentence rules of technical-writing. Leading words from writing-for-agents are correct here, although unslop rules 26 and 32 remove metaphors from text for people.

## Workflows

- Answer a how or why question directly from the relevant evidence. The question's wording alone does not require delegation or a report.
- [figure-it-out](references/figure-it-out.md): use only when the user says "figure it out yourself", or hands off a large task to finish alone.

Imported text names upstream skills. \`unslop\` and \`technical-writing\` mean the references above. Other pstack skills, such as \`how\`, \`why\`, \`poteto-mode\`, \`show-me-your-work\`, \`teach\`, \`architect\`, and \`arena\`, are not in this bundle. Continue without them. Relative paths stay relative to the imported file.

## Writing the reply

Answer the current question first. For a routine question or completion update, default to one short paragraph or up to three short bullets. Expand when the user asks for depth or the task needs more detail.

- Include the facts needed to understand the answer, make a decision, or use the result safely. Explain any distinction that the reader needs to connect the evidence to your answer. Preserve requested deliverables, material risks, unresolved decisions, and verification limits.
- Choose sections for the current request. Chat does not need a section template or separate consumer and maintainer framing. These chat rules take precedence over presentation templates in this skill's imported references.
- Summarize worker findings once. Report the conclusion, relevant verification, and unresolved issues. Link a detailed artifact when useful. Include a full plan or worker report when the user requests it.
- Cite evidence where it supports a material claim. Distinguish observation from inference when the difference matters. Routine statements need no repeated confidence labels. Link only artifacts you produced or read this session.
- Write complete, plain sentences with one thought each. Follow unslop as you draft. Use periods instead of long dashes. A colon before a list is fine.

${commentRules}

## Model roles

This table sets the models for the figure-it-out workflow.

| Role | Used by | Claude Code | Codex | T3 |
| --- | --- | --- | --- | --- |
| investigation | figure-it-out units | \`claude-opus-5-5\` | \`gpt-6.1-sol\` xhigh | \`codex/gpt-6.1-sol\` xhigh |
| adversarial | figure-it-out review, debates | \`gpt-6-astra\` high, through the Codex CLI | \`claude-opus-5-5\` high, through the Claude CLI | the other family: \`codex/gpt-6-astra\` high reviews Claude work, \`claudeAgent/claude-opus-5-5\` high reviews Codex work |

Find the harness from your tools. \`delegate_task\` means T3. \`spawn_agent\` means Codex. The \`Agent\` tool means Claude Code. In T3, use the native tool when it runs the model in the T3 column, and \`delegate_task\` otherwise. The Claude Code \`Agent\` tool sets the model only, so its subagents use the effort of the session.

- Investigation edits only in its own worktree, and never commits or pushes. Claude Code: \`isolation: worktree\`. Codex: \`spawn_agent\` with agent type \`worker\`. T3: \`runtimeMode: auto-accept-edits\`. The parent session checks the result.
- Adversarial review uses the first option that works. First, T3 \`delegate_task\`. Second, the CLI of the other harness, read-only: \`codex exec -m gpt-6-astra -c model_reasoning_effort=high -s read-only "<prompt>"\` or \`claude -p --model claude-opus-5-5 --effort high --permission-mode plan "<prompt>"\`. Third, a new subagent of the same family that gets only the artifact and the goal. The reply names the reviewer model and the option used.
- If the harness rejects a model, use the parent model and say so in the reply.

## Sources

This bundle imports selected skills from cursor/plugins (pstack) and mattpocock/skills. Each reference keeps its upstream text. Only this file and \`references/figure-it-out.md\` hold Flow Copilot text. Upstream metadata, plugin files, and agent UI files are not included.
`, "cursor/plugins", pstack.revision);
  return `## Clarity skill\n\nFlow Copilot combines selected skills from both sources into one skill. It replaces skill entry filenames with index.md references, keeps each source in its own directory, and records each upstream invocation flag. The router defines local reply rules for concise chat, keeps the comment rules from pstack \`poteto-mode\`, and holds one model role table for Claude Code, Codex, and T3. \`references/figure-it-out.md\` is Flow Copilot text based on the ideas of the pstack \`figure-it-out\` skill.\n\n${notices.join("\n\n")}\n`;
}

// Clerk publishes a flat skills/ directory. Each bundled skill is listed under its router
// section; each skipped skill is listed in clerkExcluded. An unlisted skill stops the sync.
const clerkSections: Record<string, string[]> = {
  Core: ["clerk-backend-api", "clerk-cli", "clerk-custom-ui", "clerk-setup"],
  Features: ["clerk-billing", "clerk-orgs", "clerk-testing", "clerk-webhooks"],
  Frameworks: ["clerk-react-patterns", "clerk-tanstack-patterns"],
  Mobile: ["clerk-expo"],
};
const clerkExcluded = [
  "clerk-android",
  "clerk-astro-patterns",
  "clerk-chrome-extension-patterns",
  "clerk-nextjs-patterns",
  "clerk-nuxt-patterns",
  "clerk-react-router-patterns",
  "clerk-swift",
  "clerk-vue-patterns",
];

// Apply a rewrite outside fenced code blocks only.
function outsideCode(text: string, rewrite: (prose: string) => string): string {
  return text
    .split(/(^```[\s\S]*?^```)/m)
    .map((part, index) => (index % 2 === 1 ? part : rewrite(part)))
    .join("");
}

// Rewrite skill-relative paths without touching the same path inside URLs.
function rewriteLocalPaths(text: string, directory: string, target: string): string {
  const pattern = new RegExp(`https?://[^\\s<>)]+|(?<![\\w./-])(?:\\./)?${directory}/`, "g");
  return text.replace(pattern, (match) => (match.startsWith("http") ? match : `${target}/`));
}

function syncClerk(checkout: Checkout): string[] {
  const sourceName = "clerk/skills";
  const sourceRoot = resolve(checkout.root, "skills");
  const upstream = readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(sourceRoot, entry.name, "SKILL.md")))
    .map((entry) => parseSkill(resolve(sourceRoot, entry.name, "SKILL.md")));
  const upstreamNames = new Set(upstream.map((skill) => skill.name));
  const sectionOf = new Map(Object.entries(clerkSections).flatMap(([section, skills]) =>
    skills.map((name) => [name, section] as const)));
  for (const name of [...sectionOf.keys(), ...clerkExcluded]) {
    if (!upstreamNames.has(name)) throw new Error(`Clerk no longer has ${name}`);
  }
  for (const name of upstreamNames) {
    if (name !== "clerk" && !sectionOf.has(name) && !clerkExcluded.includes(name)) {
      throw new Error(`Clerk added ${name}; add it to clerkSections or clerkExcluded`);
    }
  }
  const selected = upstream
    .filter((skill) => sectionOf.has(skill.name))
    .map((skill) => ({ ...skill, section: sectionOf.get(skill.name)! }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const rootSkill = parseSkill(resolve(sourceRoot, "clerk", "SKILL.md"));

  // Clerk has no standalone LICENSE file; the README and plugin metadata declare MIT.
  const plugin = JSON.parse(readFileSync(resolve(checkout.root, "plugin.json"), "utf8"));
  const readme = readFileSync(resolve(checkout.root, "README.md"), "utf8");
  if (plugin.license !== "MIT" || !/^## License\n\nMIT\n/m.test(readme)) {
    throw new Error("Clerk upstream license changed");
  }
  for (const skill of selected) {
    const text = readFileSync(resolve(skill.root, "SKILL.md"), "utf8");
    if (!/^license: MIT$/m.test(text)) throw new Error(`${skill.name}: skill license is not MIT`);
  }

  const names = new Set(selected.map((skill) => skill.name));
  // Former sibling skill names are references here. Excluded skills stay plain text.
  const linkSkills = (text: string, prefix: string) =>
    outsideCode(text, (prose) =>
      prose
        .replace(/`clerk` skill\b/g, `[Clerk router](${prefix}../SKILL.md)`)
        .replace(/(?<!\[)`(clerk-[a-z-]+)`/g, (match, name: string) =>
          names.has(name) ? `[${name}](${prefix}${name}.md)` : match));
  const replaceExact = (text: string, from: string, to: string) => {
    if (!text.includes(from)) throw new Error(`Clerk text changed upstream: ${from}`);
    return text.replaceAll(from, to);
  };

  const target = resolve(repositoryRoot, "skills", "clerk");
  resetDirectory(target, "clerk");
  const references = resolve(target, "references");
  // Evals and starter templates are upstream development material that no imported instruction reads.
  const excludedDirectories = new Set(["evals", "templates"]);
  for (const skill of selected) {
    const supportDirectories = readdirSync(skill.root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !excludedDirectories.has(entry.name))
      .map((entry) => entry.name);
    const unexpected = readdirSync(skill.root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name !== "SKILL.md");
    if (unexpected.length) {
      throw new Error(`${skill.name}: unexpected supporting file ${unexpected[0].name}`);
    }
    // references/ is flattened into references/<skill>/; other directories keep their name.
    const destinationOf = (directory: string) =>
      directory === "scripts" ? `scripts/${skill.name}`
        : directory === "references" ? skill.name
          : `${skill.name}/${directory}`;
    let body = skill.body;
    for (const directory of supportDirectories) {
      body = rewriteLocalPaths(body, directory, destinationOf(directory));
    }
    if (skill.name === "clerk-backend-api") {
      body = replaceExact(body, "User Prompt: $ARGUMENTS", "User Prompt: the user's request that selected this reference.");
    }
    if (skill.name === "clerk-cli") {
      body = replaceExact(body, "(../clerk-setup/SKILL.md)", "(clerk-setup.md)");
    }
    if (skill.name === "clerk-setup") {
      body = replaceExact(body, "[clerk skill](https://clerk.com/.well-known/skills/clerk/SKILL.md)", "[Clerk router](../SKILL.md)");
    }
    body = linkSkills(body, "");
    const metadata = readFileSync(resolve(skill.root, "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---\n/)!;
    const compatibility = (Bun.YAML.parse(metadata[1]) as { compatibility?: unknown }).compatibility;
    if (typeof compatibility === "string") body = `> **Requirements:** ${compatibility.trim()}\n\n${body}`;
    if (/(?<!\(\.\.\/)SKILL\.md\b/.test(body)) throw new Error(`${skill.name}: unresolved SKILL.md link`);
    writeMarkdown(resolve(references, `${skill.name}.md`), body, sourceName, checkout.revision);

    for (const directory of supportDirectories) {
      const destination = directory === "scripts"
        ? resolve(target, "scripts", skill.name)
        : resolve(references, destinationOf(directory));
      const depth = directory === "references" ? 1 : 2;
      const transform = (text: string) => {
        // A bare SKILL.md in a supporting file means its own skill's instructions.
        let rewritten = linkSkills(text, "../".repeat(depth))
          .replace(/(?<!\]\()(?<![\w./])SKILL\.md\b/g, `[${skill.name}](${"../".repeat(depth)}${skill.name}.md)`);
        // Custom UI version files name their sibling directory from the skill root.
        if (skill.name === "clerk-custom-ui") rewritten = rewritten.replace(/`core-([23])\//g, "`../core-$1/");
        return rewritten;
      };
      copyTree(resolve(skill.root, directory), destination, sourceName, checkout.revision, transform);
    }
  }

  for (const file of [
    "clerk-billing/billing-components.md",
    "clerk-custom-ui/core-3/show-component.md",
    "clerk-orgs/nextjs-patterns.md",
  ]) {
    patchGeneratedFile(resolve(references, file), [[
      "Cache Components (`cacheComponents: true`, the `create-next-app` default)",
      "Cache Components enabled (`cacheComponents: true`)",
    ]]);
  }
  for (const file of ["clerk-setup.md", "clerk-billing/b2b-patterns.md", "clerk-billing/b2c-patterns.md"]) {
    patchGeneratedFile(resolve(references, file), [[
      "`cacheComponents: true` (the `create-next-app` default)", "`cacheComponents: true`",
    ]]);
  }
  for (const file of ["clerk-orgs.md", "clerk-billing/billing-components.md"]) {
    patchGeneratedFile(resolve(references, file), [[
      "Cache Components (the `create-next-app` default)", "Cache Components enabled (`cacheComponents: true`)",
    ]]);
  }
  patchGeneratedFile(resolve(references, "clerk-billing.md"), [
    ["Cache Components rules (`cacheComponents: true`, the `create-next-app` default)",
      "Cache Components rules when enabled (`cacheComponents: true`)"],
    [
      "Let users manage their subscription from inside the app by rendering `<PricingTable />` on a billing page. It renders differently for subscribed users: it shows the current plan and allows upgrades or cancellations, all through Clerk's in-app checkout drawer.",
      "Let users choose or change plans by rendering `<PricingTable />` on a billing page. For cancellations and full subscription management, use `<UserProfile />` or `<OrganizationProfile />`.",
    ],
  ]);

  mkdirSync(resolve(target, "licenses"), { recursive: true });
  copyFileSync(resolve(checkout.root, "plugin.json"), resolve(target, "licenses", "clerk-plugin.json"));

  const versionSection = rootSkill.body.match(/^## Version Detection\n[\s\S]*?(?=\n---\n)/m);
  if (!versionSection) throw new Error("Clerk router version section changed upstream");
  const excluded = clerkExcluded.map((name) => `\`${name}\``);
  const sections = Object.keys(clerkSections).map((section) => {
    const skills = selected.filter((skill) => skill.section === section);
    return `### ${section}\n\n${workflowList(skills)}`;
  }).join("\n\n");
  writeSkill(resolve(target, "SKILL.md"), frontmatter(
    "clerk",
    "Load this skill before you read or change code in a project whose package.json lists @clerk packages, or when the task names Clerk. Covers sign-in, protected routes, sessions, organizations, billing, webhooks, the Clerk CLI and Backend API, and auth tests.",
    sourceName, checkout.revision, {}, "MIT",
  ), `# Clerk

Detect the installed Clerk SDK version first, then read only the references that match the task. A former \`clerk-*\` skill name now refers to its file below. Do not expect separate Clerk skills to be installed. Script paths in references are relative to this skill directory.

This bundle imports a subset of Clerk's skills. Not bundled: ${excluded.join(", ")}. When a reference points to one of these, use the current Clerk documentation for that framework instead.

${linkSkills(versionSection[0], "references/").trim()}

## Workflows

${sections}

## Common rules

- Treat the installed \`@clerk/*\` packages, their type declarations, and current Clerk documentation as the source of truth when a reference differs.
- Load more than one reference when a task crosses areas. For example, B2B billing needs both the organizations and billing references.
- Confirm before any write to a Clerk instance, and never use production keys for tests.
`, sourceName, checkout.revision);
  return selected.map((skill) => skill.name);
}

// agent-browser keeps its guides in skill-data/. Its skills/agent-browser/SKILL.md is a stub
// that tells agents to load the same guides from the installed CLI, so the router keeps that rule.
const agentSurfRoots: Record<typeof agentSurfSources[number], string> = {
  "agent-browser": "skill-data",
  "agent-device": "skills",
  "agent-desktop": "skills",
};
const agentSurfEntries: Record<typeof agentSurfSources[number], string> = {
  "agent-browser": "core/index.md",
  "agent-device": "agent-device/index.md",
  "agent-desktop": "agent-desktop/index.md",
};

function syncAgentSurf(checkouts: Record<typeof agentSurfSources[number], Checkout>): string {
  const bundle = "agent-surf";
  const target = resolve(repositoryRoot, "skills", bundle);
  const stub = readFileSync(resolve(checkouts["agent-browser"].root, "skills/agent-browser/SKILL.md"), "utf8");
  if (!stub.includes("agent-browser skills get core")) {
    throw new Error("agent-browser: discovery stub no longer points to `agent-browser skills get core`");
  }
  const imports = agentSurfSources.map((name) => {
    const tree = readSkillTree(name, checkouts[name], agentSurfRoots[name]);
    if (name === "agent-device") {
      const license = readFileSync(resolve(tree.checkout.root, "LICENSE"), "utf8");
      if (!license.includes("MIT License") || !license.includes("Permission is hereby granted") ||
          !license.includes("Copyright (c) 2026 Callstack")) {
        throw new Error(`${name}: upstream license changed`);
      }
    } else {
      assertApacheLicense(tree.checkout, name);
    }
    if (!tree.skills.some((skill) => skill.path === agentSurfEntries[name])) {
      throw new Error(`${name}: missing entry skill ${agentSurfEntries[name]}`);
    }
    // The router lists one flat directory per skill; nested skills need router changes.
    const nested = tree.skills.find((skill) => skill.path.split("/").length !== 2);
    if (nested) throw new Error(`${name}: unexpected nested skill ${nested.path}`);
    return tree;
  });
  resetDirectory(target, bundle);
  const sections: string[] = [];
  const notices: string[] = [];
  mkdirSync(resolve(target, "licenses"), { recursive: true });
  for (const tree of imports) {
    const { name, checkout, skills } = tree;
    const sourceName = writeSkillTree(tree, bundle);
    sections.push(`## ${name}\n\n${skillRoutes(name, skills)}`);
    const licenseFile = `${name}-LICENSE`;
    copyFileSync(resolve(checkout.root, "LICENSE"), resolve(target, "licenses", licenseFile));
    notices.push(`### ${name}\n\nImported from [${sourceName}](https://github.com/${sourceName}) revision \`${checkout.revision}\`, dated ${checkout.date}, from its \`${agentSurfRoots[name]}/\` directory. The upstream ${name === "agent-device" ? "MIT license and copyright notice are" : "Apache License 2.0 is"} retained in \`skills/${bundle}/licenses/${licenseFile}\`.`);
  }
  // Upstream examples that contradict the upstream reference. Each guard stops the sync when the text changes.
  const browser = resolve(target, "references/agent-browser");
  patchGeneratedFile(resolve(browser, "electron/index.md"), [
    ["# Switch to a specific tab by index\nagent-browser tab 2", "# Switch to a specific tab by id (positional numbers are rejected)\nagent-browser tab t2"],
    ["#   0: [page]    Slack - Main Window     https://app.slack.com/\n#   1: [webview] Embedded Content        https://example.com/widget",
      "#   t1: [page]    Slack - Main Window     https://app.slack.com/\n#   t2: [webview] Embedded Content        https://example.com/widget"],
    ["# Switch to a webview\nagent-browser tab 1", "# Switch to a webview\nagent-browser tab t2"],
  ]);
  patchGeneratedFile(resolve(browser, "core/references/snapshot-refs.md"), [[
    "agent-browser snapshot -i          # Get new refs\nagent-browser click @e1            # Use new refs",
    "agent-browser snapshot -i          # Get new refs\nagent-browser click @e12           # Use a ref from the new snapshot",
  ]]);
  patchGeneratedFile(resolve(browser, "core/references/proxy-support.md"), [[
    "region=$(echo \"$proxy\" | grep -oP '^\\w+-\\w+')",
    "region=$(echo \"$proxy\" | sed -E 's#^[a-z]+://##; s#-proxy.*##')",
  ]]);
  patchGeneratedFile(resolve(browser, "core/references/authentication.md"), [
    ["export AGENT_BROWSER_ENCRYPTION_KEY=$(openssl rand -hex 32)",
      "# Create the key once with `openssl rand -hex 32`, store it, and reuse it. A new key cannot decrypt saved state.\nexport AGENT_BROWSER_ENCRYPTION_KEY=\"$(cat ~/.config/agent-browser/encryption-key)\""],
    ["echo \"*.auth-state.json\" >> .gitignore", "echo \"*auth-state.json\" >> .gitignore"],
  ]);
  patchGeneratedFile(resolve(browser, "core/references/session-management.md"), [[
    "echo \"*.auth-state.json\" >> .gitignore", "echo \"*auth-state.json\" >> .gitignore",
  ]]);
  for (const [file, prefix] of [["authenticated-session.sh", "auth"], ["capture-workflow.sh", "capture"], ["form-automation.sh", "form"]]) {
    patchGeneratedFile(resolve(browser, "core/templates", file), [[
      "set -euo pipefail\n",
      `set -euo pipefail\n\n# Use a named session, so this script does not drive or close another agent's browser.\nexport AGENT_BROWSER_SESSION="\${AGENT_BROWSER_SESSION:-$(agent-browser session id --scope worktree --prefix ${prefix})}"\n`,
    ]]);
  }
  // Discovery mode exits before the login flow saves new state, so deleting the old file loses it.
  patchGeneratedFile(resolve(browser, "core/templates/authenticated-session.sh"), [[
    "        echo \"Failed to load state, re-authenticating...\"\n    fi\n    rm -f \"$STATE_FILE\"\nfi\n",
    "        echo \"Failed to load state, re-authenticating...\"\n    fi\n    # Keep the old state. The login flow overwrites it when it runs state save.\nfi\n",
  ]]);
  patchGeneratedFile(resolve(target, "references/agent-desktop/jev-desktop/index.md"), [[
    "Which of the 16 interaction verbs it asks for.", "Which of the 12 interaction verbs it asks for.",
  ]]);
  for (const path of ["references/agent-browser/slack/references/slack-tasks.md", "references/agent-browser/slack/templates/slack-report-template.md"]) {
    if (!existsSync(resolve(target, path))) throw new Error(`agent-surf: router links missing slack file ${path}`);
  }
  const desktopDirectory = resolve(target, "references/agent-desktop/agent-desktop/references");
  const desktopNames = readdirSync(desktopDirectory).filter((file) => file.endsWith(".md")).sort();
  if (desktopNames.length === 0) throw new Error("agent-surf: agent-desktop has no named references");
  const desktopReferences = desktopNames
    .map((file) => `[${file.replace(/\.md$/, "")}](references/agent-desktop/agent-desktop/references/${file})`)
    .join(", ");
  const first = checkouts["agent-browser"];
  writeSkill(resolve(target, "SKILL.md"), frontmatter(bundle,
    "Load this skill before you drive a browser, an iOS or Android device, a simulator or emulator, or a desktop app, or write a shell script that drives one, or when package.json or the task names agent-browser, agent-device, or agent-desktop. Covers web automation, screenshots and scraping, Electron apps and Slack, mobile and TV apps, exploratory QA, and native desktop apps on macOS, Windows, and Linux. Do not load it for Playwright, Cypress, Detox, or XCUITest test files.",
    "vercel-labs/agent-browser", first.revision,
    {
      upstream_agent_device: `callstack/agent-device@${checkouts["agent-device"].revision}`,
      upstream_agent_desktop: `vercel-labs/agent-desktop@${checkouts["agent-desktop"].revision}`,
    }, "Apache-2.0 AND MIT"),
    `# Agent Surf

Three CLIs let an agent act on a live interface. Each one reads the interface as an accessibility tree with short element refs, then clicks, types, and scrolls by ref. Choose the CLI by the surface that the task acts on. Read only the matching reference and its supporting files.

All paths in this file are relative to the folder that contains this SKILL.md. For example, \`references/agent-browser/core/index.md\` is \`<skills folder>/agent-surf/references/agent-browser/core/index.md\`.

## Choose a CLI

- Web pages, web apps, and cloud browsers: agent-browser. Start with [core](references/agent-browser/core/index.md).
- iPhone, iPad, and Android devices, iOS Simulator, Android Emulator, and TV apps: agent-device. Start with [agent-device](references/agent-device/agent-device/index.md).
- Native desktop apps and system surfaces such as menus, the menu bar, the tray, and notifications on macOS, Windows, or Linux: agent-desktop. Start with [agent-desktop](references/agent-desktop/agent-desktop/index.md), then read the guide for the operating system.
- Electron apps such as VS Code, Slack, Discord, or Notion: use the agent-browser [electron](references/agent-browser/electron/index.md) workflow, which connects over the Chrome DevTools Protocol. Use agent-desktop when the task also touches native windows or system surfaces.
- Exploratory QA or a bug hunt: use the agent-browser [dogfood](references/agent-browser/dogfood/index.md) workflow for a web app, and the agent-device [dogfood](references/agent-device/dogfood/index.md) workflow for a mobile app.

## Installed versions

Read the bundled reference before the first command. It works when the CLI is not installed. The references are a snapshot of each upstream revision, and the installed CLI can be newer. When a command or flag from a reference fails, run the matching \`skills get\` command. It prints the guide for the installed version. An upstream guide that says to run \`skills get\` means the bundled file below:

- \`agent-browser skills get <name>\`: \`references/agent-browser/<name>/index.md\`. For example, \`agent-browser skills get core\` is [core](references/agent-browser/core/index.md).
- \`agent-desktop skills get desktop\`: [agent-desktop](references/agent-desktop/agent-desktop/index.md). Its named references are ${desktopReferences}.
- \`agent-desktop skills get platform\`: the guide for the current operating system, \`references/agent-desktop/agent-desktop-<os>/index.md\`, where \`<os>\` is \`macos\`, \`windows\`, or \`linux\`.
- \`agent-desktop skills get <skill> <path>\`: \`references/agent-desktop/<skill>/<path>\`.

For agent-device, run \`agent-device help <topic>\` when a command shape is unclear.

The slack workflow does not link its supporting files. Use [slack-tasks](references/agent-browser/slack/references/slack-tasks.md) for task recipes and the [report template](references/agent-browser/slack/templates/slack-report-template.md) for a written summary.

Use [jev-desktop](references/agent-desktop/jev-desktop/index.md) only when the user has a clone of the agent-desktop repository and a \`TYPESAFE_API_KEY\`.

An upstream skill name, such as \`core\` or \`ios-simulator\`, means its index.md reference in the same source directory. Both agent-browser and agent-device have a \`dogfood\` skill. Use the one for the surface under test. Relative paths stay relative to the imported file.

This bundle imports \`skill-data/\` from agent-browser and \`skills/\` from agent-device and agent-desktop. The agent-browser discovery stub, plugin metadata, and agent UI metadata are not included.

${sections.join("\n\n")}
`, "vercel-labs/agent-browser", first.revision);
  return `## Agent Surf skill\n\nFlow Copilot combines the skills of agent-browser, agent-device, and agent-desktop into one skill. It replaces the agent-browser discovery stub with one router that maps each CLI guide command to its bundled reference, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links. It also corrects upstream examples that contradict the upstream reference: Electron tab IDs, a ref reused after navigation, the proxy region parser, the state encryption key and its .gitignore pattern, the jev-desktop verb count, named sessions in the browser templates, and a saved state that the authentication template deleted before it saved a new one.\n\n${notices.join("\n\n")}\n`;
}

function assertApacheLicense(checkout: Checkout, name: string) {
  const license = readFileSync(resolve(checkout.root, "LICENSE"), "utf8");
  if (!license.includes("Apache License") || !license.includes("Version 2.0")) {
    throw new Error(`${name}: upstream license is no longer Apache-2.0`);
  }
}

const bundleNames = ["ax", "convex", "cloudflare", "expo", "clerk", "react-native", "design-engineering", "clarity", "agent-surf"] as const;
type BundleName = typeof bundleNames[number];

function syncBundle(name: BundleName): string {
  if (name === "react-native") {
    const checkouts = {
      "software-mansion": clone("software-mansion"),
      callstack: clone("callstack"),
    };
    const notice = syncReactNative(checkouts);
    for (const source of reactNativeSources) console.log(`${source}: ${checkouts[source].revision}`);
    return notice;
  }
  if (name === "design-engineering") {
    const checkouts = {
      "emil-kowalski": clone("emil-kowalski"),
      "jakub-krehel": clone("jakub-krehel"),
    };
    const notice = syncDesignEngineering(checkouts);
    for (const source of designEngineeringSources) console.log(`${source}: ${checkouts[source].revision}`);
    return notice;
  }
  if (name === "clarity") {
    const checkouts = { pstack: clone("pstack"), "matt-pocock": clone("matt-pocock") };
    const notice = syncClarity(checkouts);
    for (const source of claritySources) console.log(`${source}: ${checkouts[source].revision}`);
    return notice;
  }
  if (name === "agent-surf") {
    const checkouts = {
      "agent-browser": clone("agent-browser"),
      "agent-device": clone("agent-device"),
      "agent-desktop": clone("agent-desktop"),
    };
    const notice = syncAgentSurf(checkouts);
    for (const source of agentSurfSources) console.log(`${source}: ${checkouts[source].revision}`);
    return notice;
  }
  const checkout = clone(name);
  if (name !== "expo" && name !== "clerk") assertApacheLicense(checkout, name);
  const adapters = { ax: syncAx, convex: syncConvex, cloudflare: syncCloudflare, expo: syncExpo, clerk: syncClerk };
  manifest[name].workflows = adapters[name](checkout);
  manifest[name].revision = checkout.revision;
  console.log(`${name}: ${checkout.revision}`);
  const notices: Record<Exclude<BundleName, "react-native" | "design-engineering" | "clarity" | "agent-surf">, string> = {
    ax: `## Ax skill

The files under \`skills/ax/\` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision \`${checkout.revision}\`, licensed under Apache License 2.0.

The imported revision is dated ${checkout.date}. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, moves shared reference files to \`references/shared/\` with adjusted links, and records the source package version.
`,
    convex: `## Convex skill

The files under \`skills/convex/\` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision \`${checkout.revision}\`, licensed under Apache License 2.0.

The imported revision is dated ${checkout.date}. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.
`,
    cloudflare: `## Cloudflare skill

The files under \`skills/cloudflare/\` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision \`${checkout.revision}\`, licensed under Apache License 2.0.

The imported revision is dated ${checkout.date}. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves specialized skill instructions into references, adjusts links for their new locations, and places bundled scripts under the combined skill.
`,
    expo: `## Expo skill

The files under \`skills/expo/\` derive from [expo/skills](https://github.com/expo/skills) revision \`${checkout.revision}\`, licensed under the MIT License, retained in \`skills/expo/LICENSE\`. The animation reference also retains its upstream copyright notice in \`skills/expo/references/expo-animation/LICENSE\`.

The imported revision is dated ${checkout.date}. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. It also updates feedback commands to use --message and corrects Observe event terminology and the MCP documentation link. Plugin metadata and hooks are not imported.
`,
    clerk: `## Clerk skill

The files under \`skills/clerk/\` derive from [clerk/skills](https://github.com/clerk/skills) revision \`${checkout.revision}\`, licensed under the MIT License. The upstream repository has no standalone LICENSE file; its plugin metadata declaring MIT is retained in \`skills/clerk/licenses/clerk-plugin.json\`.

The imported revision is dated ${checkout.date}. Flow Copilot imports a selected subset of the skills: all core and feature skills, the React and TanStack Start framework skills, and the Expo mobile skill. It replaces the upstream router with one router that keeps its version table, moves skill instructions and supporting files into references, adjusts links and script paths, and links former skill names to their references. It also removes Cache Components default claims and directs subscription cancellation to the profile components. Evaluation fixtures, starter templates, and plugin metadata are not imported.
`,
  };
  return notices[name];
}

try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--only" || !bundleNames.includes(args[1] as BundleName))) {
    throw new Error(`Usage: bun run sync [--only ${bundleNames.join("|")}]`);
  }
  const selected = args.length ? [args[1] as BundleName] : bundleNames;
  const noticePath = resolve(repositoryRoot, "NOTICE.md");
  let notices = readFileSync(noticePath, "utf8");
  for (const name of selected) {
    const section = syncBundle(name).trim();
    const heading = section.split("\n")[0];
    const existing = new RegExp(`^${heading}\\n[\\s\\S]*?(?=^## |$(?![\\s\\S]))`, "m");
    if (existing.test(notices)) notices = notices.replace(existing, () => `${section}\n\n`);
    else notices = `${notices.trim()}\n\n${section}\n`;
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(noticePath, normalized(notices));
} finally {
  rmSync(workspace, { force: true, recursive: true });
}
