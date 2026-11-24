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
type Manifest = Record<"ax" | "cloudflare" | "convex" | "expo" | "software-mansion" | "callstack" | "clerk" | "emil-kowalski" | "jakub-krehel" | "pstack" | "matt-pocock" | "agent-browser" | "agent-device" | "agent-desktop" | "gh-stack", SourceConfig>;
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

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const update = args.includes("--update");

// Without --update, fetch the pinned SHA so that a sync reproduces the committed output.
function clone(name: keyof Manifest): Checkout {
  const root = resolve(workspace, name);
  const { repository, revision: pinned } = manifest[name];
  if (update || !pinned) {
    run(["git", "clone", "--depth", "1", repository, root]);
  } else {
    mkdirSync(root, { recursive: true });
    run(["git", "-c", "init.defaultBranch=main", "init", "-q"], root);
    run(["git", "remote", "add", "origin", repository], root);
    run(["git", "fetch", "-q", "--depth", "1", "origin", pinned], root);
    run(["git", "checkout", "-q", "FETCH_HEAD"], root);
  }
  const revision = run(["git", "rev-parse", "HEAD"], root);
  if (!update && pinned && revision !== pinned) {
    throw new Error(`${name}: fetched ${revision}, expected pinned ${pinned}`);
  }
  return {
    root,
    revision,
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

// Agents read this line, so it names only the source. The frontmatter and NOTICE.md hold the revision.
function notice(source: string): string {
  return `<!-- Modified by Flow Copilot from ${source}. -->`;
}

function writeMarkdown(
  path: string,
  text: string,
  source: string,
) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  const marker = notice(source);
  const withoutOldMarker = text.replace(
    /^<!-- Modified by Flow Copilot from [^\n]*? -->\n*/,
    "",
  );
  writeFileSync(path, normalized(`${marker}\n\n${withoutOldMarker}`));
}

function writeSkill(
  path: string,
  metadata: string,
  body: string,
  source: string,
) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(
    path,
    normalized(`${metadata}\n\n${notice(source)}\n\n${body}`),
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
    );
  }
  copyTree(
    resolve(sourceRoot, "references"),
    resolve(references, "shared"),
    sourceName,
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
    );
    copyTree(
      resolve(skill.root, "references"),
      resolve(references, skill.name),
      sourceName,
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
    );
    copyTree(
      resolve(skill.root, "references"),
      resolve(references, skill.name),
      sourceName,
    );
    copyTree(
      resolve(skill.root, "scripts"),
      resolve(target, "scripts", skill.name),
      sourceName,
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
    "Load this skill before you read or change code in a Cloudflare Workers or Pages project, such as one with a wrangler config, a cloudflare.config.ts file, or a wrangler dependency, or when the task names a Cloudflare product. Covers Workers, Pages, D1, KV, R2, Queues, Durable Objects, the Agents SDK, Wrangler and the cf CLI, security, and networking.",
    sourceName,
    checkout.revision,
  );
  writeSkill(
    resolve(target, "SKILL.md"),
    metadata,
    rootBody,
    sourceName,
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
      .replace(/<(?:skill-(?:dir|root)|absolute skill directory)>\/scripts\//g, `<skill-root>/scripts/${skill.name}/`)
      .replaceAll("${CLAUDE_PLUGIN_ROOT}/skills/expo-skill-feedback/scripts/", "<skill-root>/scripts/expo-skill-feedback/")
      // A supporting file moves from <skill>/references/ to references/<skill>/.
      .replace(/\.\.\/\.\.\/([a-z0-9-]+)\/references\//g, (match, name: string) => names.has(name) ? `../${name}/` : match);
    let body = transform(skill.body)
      // Another skill's references/ directory is now references/<skill>/, next to this file.
      .replace(/(?:\.\.\/)?([a-z0-9-]+)\/references\//g, (match, name: string) => names.has(name) ? `${name}/` : match)
      .replace(/(?:\.\/)?references\//g, `${skill.name}/`);
    for (const entry of supportingFiles) {
      body = body.replaceAll(entry.name, `${skill.name}/${entry.name}`);
    }
    writeMarkdown(resolve(target, "references", `${skill.name}.md`), body, sourceName);
    copyTree(resolve(skill.root, "references"), resolve(target, "references", skill.name), sourceName, transform);
    copyTree(resolve(skill.root, "scripts"), resolve(target, "scripts", skill.name), sourceName);
    for (const entry of supportingFiles) {
      const destination = resolve(target, "references", skill.name, entry.name);
      mkdirSync(resolve(destination, ".."), { recursive: true });
      if (entry.name.endsWith(".md")) {
        writeMarkdown(destination, transform(readFileSync(resolve(skill.root, entry.name), "utf8")), sourceName);
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
  // Upstream names files by paths that are wrong in the combined layout, or in the upstream one.
  patchGeneratedFile(resolve(target, "references/expo-overview.md"), [[
    "`expo-overview/native-ios.md` covers", "`eas-app-stores/native-ios.md` covers",
  ]]);
  patchGeneratedFile(resolve(target, "references/eas-app-stores/testflight.md"), [[
    "bundled `scripts/status-summary.cjs`", "bundled `<skill-root>/scripts/eas-app-stores/status-summary.cjs`",
  ]]);
  // The migration goal runs from the app directory, so its paths start at the skill root.
  patchGeneratedFile(resolve(target, "references/expo-web-to-native/run-as-goal.md"), [
    ["references/expo-web-to-native.md", "<skill-root>/references/expo-web-to-native.md"],
    ["references/native-patterns.md", "<skill-root>/references/expo-web-to-native/native-patterns.md"],
    ["references/false-friends.md", "<skill-root>/references/expo-web-to-native/false-friends.md"],
    ["references/verify-on-device.md", "<skill-root>/references/expo-web-to-native/verify-on-device.md"],
  ]);
  writeSkill(resolve(target, "SKILL.md"), frontmatter(
    "expo",
    "Load this skill before you read or change code in a project whose package.json lists expo, or when the task names Expo or EAS. Covers routes and navigation, data fetching, native UI, native modules, SDK upgrades, EAS builds, hosting, and OTA updates.",
    sourceName, checkout.revision, {}, "MIT",
  ), `# Expo

Read [expo-overview](references/expo-overview.md) for shared setup rules, then load the references that match the user's goal. Expo documentation and the installed Expo and EAS CLIs are the source of truth.

Former Expo and EAS skill names refer to the workflow files below. Load those references when an imported instruction asks for another skill or its SKILL.md. Paths in workflow references are relative to that reference; \`<skill-root>\` means this combined expo directory. The upstream overview mentions expo-tailwind-setup, which is not present in this source collection; consult current Expo documentation for that topic.

This package contains skill instructions and helper scripts. Plugin MCP configuration and telemetry hooks are not installed by this package.

${routes}
`, sourceName);
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
      writeMarkdown(destination, rewritten, sourceName);
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
    "Load this skill before you read or change code in a project whose package.json lists react-native. Covers crashes, slow screens and long lists, animations and gestures with Reanimated or Gesture Handler, on-device AI with ExecuTorch, native modules, navigation, and upgrades.",
    "software-mansion-labs/skills", first.revision,
    { upstream_callstack: `callstackincubator/agent-skills@${checkouts.callstack.revision}` }, "MIT"),
    `# React Native

Use the target project's installed versions and the user's task to select references. Read only the relevant workflow and its supporting files.

## Choose a source

- For animations, gestures, audio, rich text, JSI, and worklets, start with [Software Mansion's best practices](references/software-mansion/react-native-best-practices/index.md).
- For on-device AI, such as LLMs, speech, and vision models, use [react-native-executorch](references/software-mansion/react-native-executorch/index.md). It is already in this bundle. Do not install it as a separate skill.
- For profiling, rendering, startup time, memory, and bundle size, start with [Callstack's best practices](references/callstack/react-native-best-practices/index.md).
- For navigation, upgrades, TV, library creation, CI, or migration, select the matching Callstack workflow below.
- For Software Mansion libraries and tools, select the matching Software Mansion workflow below. These workflows can also cover web or native platforms; apply only the parts relevant to the task.

Both upstream skills named react-native-best-practices are preserved. Their source directories prevent filename collisions. A request to read an upstream skill means its index.md reference in the same source directory. Relative paths remain relative to the imported file. When advice overlaps, use the guidance that matches the installed library and version; resolve conflicting claims against current official documentation.

This bundle imports the skills directories of both repositories, including nested skills. Plugin configuration and externally hosted skills linked by upstream READMEs are not included.

${sections.join("\n\n")}
`, "software-mansion-labs/skills");
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
  const first = checkouts["emil-kowalski"];
  writeSkill(resolve(target, "SKILL.md"), frontmatter(bundle,
    "Load this skill before you build, change, or review UI components in a web or React Native app. Covers forms and accessibility, toasts and notifications, animation and motion, typography, color, layout, and product copy.",
    "emilkowalski/skills", first.revision,
    { upstream_jakub_krehel: `jakubkrehel/skills@${checkouts["jakub-krehel"].revision}` }, "MIT"),
    `# Design Engineering

Use the target project's stack, design tokens, and installed libraries to select references. Read only the relevant workflow and its supporting files.

## Choose a source

- For motion in Expo, choreography of many elements, gestures, and animation performance, use Emil Kowalski's workflows, such as \`animate-expo\`, \`choreograph\`, \`gestures\`, and \`animation-performance\`. [emil-design-eng](references/emil-kowalski/emil-design-eng/index.md) holds the shared philosophy.
- For web motion recipes and motion reviews, use either Emil Kowalski's \`animate\` and \`review-animations\` or Jakub Krehel's [better-motion](references/jakub-krehel/better-motion/index.md).
- For static interface quality, such as UI polish, typography, color, layout, accessibility, and product copy, use the matching Jakub Krehel \`better-*\` workflow. [better-interface](references/jakub-krehel/better-interface/index.md) combines them into one review.
- When both sources cover a topic, such as motion in \`better-motion\` and \`animate\`, or typography in \`better-typography\` and \`apple-design\`, select one workflow. Use its values, for example stagger timing and drag bounce, because the sources do not agree on them. Keep the project's existing tokens.

A former upstream skill name, such as \`review-animations\` or \`better-colors\`, now refers to its index.md reference in the same source directory. Those workflows are available whenever this skill is installed; load them when an imported instruction asks for another skill. Relative paths remain relative to the imported file.

Upstream instructions that describe a first response for an invocation without a question apply when the user selected that workflow explicitly. Workflows listed as explicit-only were user-invoked upstream; do not start them unprompted.

This bundle imports the skills directories of both repositories. Plugin metadata, agent UI metadata, and root-level files are not included.

${sections.join("\n\n")}
`, "emilkowalski/skills");
  return `## Design Engineering skill\n\nFlow Copilot combines both collections into one skill, replaces skill entry filenames with index.md references, groups user-invoked skills in the router, preserves source-specific directories and supporting files, and adjusts local entry-file links.\n\n${notices.join("\n\n")}\n`;
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

// Reply and comment rules are local so upstream sync cannot restore the longer chat format.
// The comment rules come from an earlier pstack poteto-mode, which no longer has a Comments section.
const clarityCommentRules = `## Comments

Comments follow the same rule as the reply. Write them clean as you go. Keep a comment only for a non-obvious *why* the code can't show. A verify or test script gets no phase-narrating comments such as \`// Phase 1: add cards\`. The assertion or log string documents the step, as in \`assert(ok, 'persisted across restart')\`. This applies to every file you produce, including the delegate's diff.`;

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
  const commentRules = clarityCommentRules;

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
  writeSkill(resolve(target, "SKILL.md"), frontmatter(bundle,
    "Load this skill before you write or rewrite prose for people or agents, such as docs, READMEs, announcements, PR descriptions, commit messages, product copy, skills, AGENTS.md, or CLAUDE.md, or before you explain how or why code works. Covers plain-language rules, technical writing, writing for agents, and explanations of how code works. Do not load it for code-only changes.",
    "cursor/plugins", pstack.revision,
    { upstream_matt_pocock: `mattpocock/skills@${checkouts["matt-pocock"].revision}` }, "MIT"),
    `# Clarity

Write every text so that its reader understands it on the first read. Answer how and why questions directly from the relevant evidence. The wording of the question alone does not require delegation or a report. Read only the references that the task needs.

## Pick the rules by reader

- Prose that a person reads: chat replies, PR bodies, commit messages, docs, issues, code comments, and product or marketing copy. Read [unslop](references/pstack/unslop/index.md) before you write the first sentence, and again when its rules are no longer in your context. Write the prose clean as you draft, to the unslop rules and the reply rules below.
- Technical text that a person reads: apply [technical-writing](references/pstack/technical-writing/index.md) to docs, READMEs, RFCs, PR descriptions, and commit messages. For technical explanations in chat, apply its sentence rules and use the reply rules below to choose length and structure.
- Text that an agent reads: skills, \`AGENTS.md\`, \`CLAUDE.md\`, files under \`docs/agents/\`, and prompts for subagents. Apply [writing-for-agents](references/matt-pocock/writing-for-agents/index.md) and the sentence rules of technical-writing. Leading words from writing-for-agents are correct here, although unslop rules 26 and 32 remove metaphors from text for people.

## Imported names

Imported text names upstream skills. \`unslop\` and \`technical-writing\` mean the references above. Other pstack skills, such as \`how\`, \`why\`, \`poteto-mode\`, \`show-me-your-work\`, \`teach\`, \`architect\`, and \`arena\`, are not in this bundle. Continue without them. Relative paths stay relative to the imported file.

## Writing the reply

Answer the current question first. For a routine question or completion update, default to one short paragraph or up to three short bullets. Expand when the user asks for depth or the task needs more detail.

- Include the facts needed to understand the answer, make a decision, or use the result safely. Explain any distinction that the reader needs to connect the evidence to your answer. Preserve requested deliverables, material risks, unresolved decisions, and verification limits.
- Choose sections for the current request. Chat does not need a section template or separate consumer and maintainer framing. These chat rules take precedence over presentation templates in this skill's imported references.
- Summarize worker findings once. Report the conclusion, relevant verification, and unresolved issues. Link a detailed artifact when useful. Include a full plan or worker report when the user requests it.
- Cite evidence where it supports a material claim. Distinguish observation from inference when the difference matters. Routine statements need no repeated confidence labels. Link only artifacts you produced or read this session.
- Write complete, plain sentences with one thought each. Follow unslop as you draft. Use periods instead of long dashes. A colon before a list is fine.

${commentRules}
`, "cursor/plugins");
  return `## Clarity skill\n\nFlow Copilot combines selected skills from both sources into one skill. It replaces skill entry filenames with index.md references, keeps each source in its own directory, and records each upstream invocation flag. The router defines local reply rules for concise chat, and keeps the comment rules from an earlier pstack \`poteto-mode\`.\n\n${notices.join("\n\n")}\n`;
}

// Clerk publishes a flat skills/ directory. Each bundled skill is listed under its router
// section; each skipped skill is listed in clerkExcluded. An unlisted skill stops the sync.
const clerkSections: Record<string, string[]> = {
  Core: ["clerk-backend-api", "clerk-cli", "clerk-custom-ui", "clerk-migrate", "clerk-setup"],
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
        .replace(/\(https:\/\/clerk\.com\/\.well-known\/skills\/(clerk-[a-z-]+)\/(?:SKILL\.md|references\/([^)\s]+))\)/g,
          (match, name: string, file?: string) =>
            !names.has(name) ? match : file ? `(${prefix}${name}/${file})` : `(${prefix}${name}.md)`)
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
    writeMarkdown(resolve(references, `${skill.name}.md`), body, sourceName);

    for (const directory of supportDirectories) {
      const destination = directory === "scripts"
        ? resolve(target, "scripts", skill.name)
        : resolve(references, destinationOf(directory));
      const depth = directory === "references" ? 1 : 2;
      const transform = (text: string) => {
        // A bare SKILL.md, or ../SKILL.md, in a supporting file means its own skill's instructions.
        const ownSkill = text
          .replaceAll("](../SKILL.md", `](${"../".repeat(depth)}${skill.name}.md`)
          .replace(/\[SKILL\.md\b/g, `[${skill.name}`);
        let rewritten = linkSkills(ownSkill, "../".repeat(depth))
          .replace(/(?<!\]\()(?<![\w./])SKILL\.md\b/g, `[${skill.name}](${"../".repeat(depth)}${skill.name}.md)`);
        // Custom UI version files name their sibling directory from the skill root.
        if (skill.name === "clerk-custom-ui") rewritten = rewritten.replace(/`core-([23])\//g, "`../core-$1/");
        return rewritten;
      };
      copyTree(resolve(skill.root, directory), destination, sourceName, transform);
    }
  }

  // create-next-app does not enable Cache Components by default.
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
    ["With Cache Components (`cacheComponents: true`, the `create-next-app` default)",
      "With Cache Components enabled (`cacheComponents: true`)"],
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
    "Load this skill before you read or change code in a project whose package.json lists @clerk packages, or when the task names Clerk. Covers sign-in, protected routes, sessions, organizations, billing, webhooks, the Clerk CLI and Backend API, user migration from other auth providers, and auth tests.",
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
`, sourceName);
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
- \`agent-browser skills get <name> --ref <reference>\`: the file with that path, name, or stem under \`references/agent-browser/<name>/\`. \`--full\` means every file in that directory.
- \`agent-desktop skills get desktop\`: [agent-desktop](references/agent-desktop/agent-desktop/index.md). Its named references are ${desktopReferences}.
- \`agent-desktop skills get platform\`: the guide for the current operating system, \`references/agent-desktop/agent-desktop-<os>/index.md\`, where \`<os>\` is \`macos\`, \`windows\`, or \`linux\`.
- \`agent-desktop skills get <skill> <path>\`: \`references/agent-desktop/<skill>/<path>\`. The \`desktop\` skill name means \`agent-desktop\`.

In the agent-desktop guides, a path such as \`references/troubleshooting.md\` starts at the guide's directory, \`references/agent-desktop/<skill>/\`, also inside a file that is already under \`references/\`.

For agent-device, run \`agent-device help <topic>\` when a command shape is unclear.

The slack workflow does not link its supporting files. Use [slack-tasks](references/agent-browser/slack/references/slack-tasks.md) for task recipes and the [report template](references/agent-browser/slack/templates/slack-report-template.md) for a written summary.

Use [jev-desktop](references/agent-desktop/jev-desktop/index.md) only when the user has a clone of the agent-desktop repository and a \`TYPESAFE_API_KEY\`.

An upstream skill name, such as \`core\` or \`ios-simulator\`, means its index.md reference in the same source directory. Both agent-browser and agent-device have a \`dogfood\` skill. Use the one for the surface under test. Relative paths stay relative to the imported file.

This bundle imports \`skill-data/\` from agent-browser and \`skills/\` from agent-device and agent-desktop. The agent-browser discovery stub, plugin metadata, and agent UI metadata are not included.

${sections.join("\n\n")}
`, "vercel-labs/agent-browser");
  return `## Agent Surf skill\n\nFlow Copilot combines the skills of agent-browser, agent-device, and agent-desktop into one skill. It replaces the agent-browser discovery stub with one router that maps each CLI guide command to its bundled reference, replaces skill entry filenames with index.md references, preserves source-specific directories and supporting files, and adjusts local entry-file links. It also corrects upstream examples that contradict the upstream reference: Electron tab IDs, a ref reused after navigation, the proxy region parser, the state encryption key and its .gitignore pattern, named sessions in the browser templates, and a saved state that the authentication template deleted before it saved a new one.\n\n${notices.join("\n\n")}\n`;
}

// gh-stack publishes one skill. The router is local, and the upstream SKILL.md becomes references/gh-stack.md.
// Each upstream reference is bundled or excluded. An unlisted reference stops the sync.
const ghStackReferences = ["stack-design", "troubleshooting"];
// `gh stack <command> --help` is the authority for flags, so the router sends agents there instead.
const ghStackExcluded = ["commands"];

// The router repeats these upstream statements. Whitespace is collapsed before the comparison,
// so a rewrap passes, and a changed word, row, or heading stops the sync for a review of the router.
// Each table guard ends with the text after the table, so an added row also stops the sync.
const ghStackGuards: Record<string, string[]> = {
  "SKILL.md": [
    "Left is the **bottom**, right is the **top**. `auth` is based on `main` and merges first; `frontend` merges last. `up` moves toward the top, away from trunk; `down` moves toward it.",
    "`gh stack` branches on whether **stdout is a TTY**. Piped, most commands error cleanly or print static text; under a PTY the same commands open a prompt or a full-screen TUI and block forever.",
    "| Always run | Never run bare | Why | |---|---|---| | `gh stack view --json` | `gh stack view` | opens a TUI under a PTY | | `gh stack submit --auto` | `gh stack submit` | prompts for a title per new PR | | `gh stack merge <target> --yes` | `gh pr merge` | `gh pr merge` cannot merge a stack | | `gh stack init <branch>...` | `gh stack init` | prompts for branch names | | `gh stack add <branch>` | `gh stack add` | prompts for a name, and fails even when piped | | `gh stack checkout <target>` | `gh stack checkout` | opens a selection menu | | `gh stack up` / `down` / `top` / `bottom` | `gh stack switch` | `switch` is menu-only | | — | `gh stack modify` | TUI-only, no non-interactive path | - `view --short`",
    "**Worktrees:** local stacks share one common-directory catalog. Use `--print-path` with navigation or explicit-target `checkout` to locate a foreign-owned branch without stealing its checkout. Unoccupied targets are checked out here first. Check the exit status before changing directories; parse only successful path-mode stdout, never status messages.",
    "- **Starting multi-part work:** create the stack before writing files. Do not implement every concern on trunk and split it later. Put one dependent concern in each layer, bottom to top.",
    "- **Editing an existing stack:** check out the layer that owns the change before editing. Never commit a lower layer's concern on the current top branch. Run `gh stack view --json`; if ownership is unclear, inspect `git log --all -- <path>`. Then check out the owner, edit, commit, rebase upstack, and return to top.",
    "gh stack down # or: gh stack checkout api git add ... && git commit -m \"Add get-user endpoint\" gh stack rebase --upstack # replay every branch above onto the change gh stack top # return to where you were gh stack push",
    "gh stack init auth # create the stack and check out its branch git add ... && git commit -m \"Add auth middleware\" gh stack add api # next layer, branched from the current one git add ... && git commit -m \"Add API routes\" gh stack submit --auto # push every branch and open draft PRs gh stack view --json # confirm",
    "gh stack sync # fetch, reconcile with GitHub, rebase, push, refresh PR state gh stack sync --prune # also delete local branches for merged PRs",
    "If the local and remote stacks have diverged, `sync` prints both chains, makes no changes, and exits 0 with `Sync aborted`",
    "Pass a PR number to merge that PR and every unmerged PR below it, or a stack number to merge every unmerged PR in that stack. The operation is all-or-nothing: if any PR in that set cannot merge, none do. Without a method flag the last-used method is reused.",
    "`gh stack view --json` writes JSON to **stdout**. Status messages go to **stderr** — do not parse them, branch on exit codes instead.",
    "branches[] name, head, base, isCurrent, isMerged, isQueued, needsRebase branches[].pr number, url, state (\"OPEN\" | \"MERGED\" | \"QUEUED\"); absent when no PR exists",
    "`needsRebase` is true when the current parent tip is no longer an ancestor of the branch.",
    "## Exit codes | Code | Meaning | Recovery | |---|---|---| | 0 | Success | — | | 1 | Generic error | Read stderr | | 2 | Not in a stack | `gh stack init`, or `gh stack checkout <target>` | | 3 | Rebase conflict | Follow the Exit 3 recovery below | | 4 | GitHub API failure | Check `gh auth status`, retry | | 5 | Invalid arguments | Fix the invocation; see `<command> --help` | | 6 | Disambiguation required | Branch is in several stacks; check out a non-shared branch | | 7 | Rebase already in progress | `gh stack rebase --continue` or `--abort` | | 8 | Stack file locked | Another `gh stack` process is writing; retry after ~5s | | 9 | Stacked PRs unavailable | Not enabled on the repository; tell the user | | 10 | Modify recovery required | `gh stack modify --abort` | **Exit 3 recovery:** - After `gh stack rebase`: resolve the files, run `git add`, then `gh stack rebase --continue`; use `gh stack rebase --abort` to restore the stack. - After `gh stack sync`: the stack has already been restored. Run `gh stack rebase` to recreate the conflict, then resolve and continue as above. ## Constraints",
    "- `rebase` and `sync` automatically update affected clean worktrees; they never auto-stash or create/remove worktrees.",
    "There is no non-interactive reorder or removal. Errors may suggest `gh stack modify`, but it is TUI-only — restructure with `unstack` then `init` instead.",
    "`gh stack <command> --help` is authoritative for flags and arguments. Note that `gh stack help <command>` does **not** work — it prints the top-level help.",
  ],
  "references/troubleshooting.md": [
    "## After a squash merge A squash merge replaces the branch's commits with one new commit, so the originals no longer exist in the trunk's history and an ordinary rebase would try to replay them again. `gh stack sync` detects this and rebases with `--onto` against the correct target, skipping the merged branch: ```bash gh stack sync gh stack view --json # merged branch reports \"isMerged\": true, \"state\": \"MERGED\" ``` No manual action is needed. If the replay conflicts, `sync` restores all branches and exits 3. Run `gh stack rebase` to rerun the rebase, which will stop at the conflict and allow you to resolve and then `--continue` until complete. Use `gh stack sync --prune` to also delete local branches for merged PRs. ## Local and remote stacks have diverged",
    "When non-interactive, `sync` prints both chains, changes nothing, and exits **0** with `Sync aborted`.",
    "gh stack unstack # removes the grouping; PRs and branches survive gh stack init --base main branch-1 branch-2 # use your trunk and desired branch order gh stack submit --auto",
    "## Restructuring a stack There is no non-interactive reorder, rename, or removal.",
    "`init` adopts branches that already exist, so the rebuild reuses them rather than creating new ones. Existing PRs survive. Once Git ancestry is correct, `submit` updates their base branches and re-links the stack on GitHub. Changing metadata does **not** change Git ancestry.",
    "Commands exit 6 when the current branch cannot identify a single stack — typically because it is the trunk of more than one stack.",
    "Commands that take an explicit stack number (`merge 7`, `unstack 7`) sidestep the problem entirely",
    "Linked worktrees themselves are supported: they share `<common-dir>/gh-stack` and do not require `link`.",
    "Navigation does not take over another worktree's checkout. Use `--print-path` with an explicit target, check the exit status, and change directory to the quoted output. Only affected clean owners are updated by rebase/sync; commit or stash manually when those owners are dirty. gh-stack does not automatically stash or create/remove worktrees.",
    "Wait and retry; read-only views remain available. Do not delete lock files to bypass coordination.",
  ],
};

function syncGhStack(checkout: Checkout): string[] {
  const sourceName = "github/gh-stack";
  const skills = readdirSync(resolve(checkout.root, "skills"), { withFileTypes: true }).map((entry) => entry.name);
  if (skills.join() !== "gh-stack") throw new Error(`gh-stack: expected only skills/gh-stack, found ${skills.join(", ")}`);
  const skillRoot = resolve(checkout.root, "skills", "gh-stack");
  const files = filesUnder(skillRoot).map((path) => relativePath(path, skillRoot));
  const listed = [...ghStackReferences, ...ghStackExcluded].map((name) => `references/${name}.md`);
  for (const file of files) {
    if (file !== "SKILL.md" && !listed.includes(file)) {
      throw new Error(`gh-stack added ${file}; add it to ghStackReferences or ghStackExcluded`);
    }
  }
  for (const file of listed) {
    if (!files.includes(file)) throw new Error(`gh-stack no longer has ${file}`);
  }
  const collapse = (text: string) => text.replace(/\s+/g, " ");
  for (const [file, guards] of Object.entries(ghStackGuards)) {
    const text = collapse(readFileSync(resolve(skillRoot, file), "utf8"));
    for (const guard of guards) {
      if (!text.includes(guard)) {
        throw new Error(`gh-stack: upstream changed ${file} text that the router repeats. Review the router, then update the guard:\n${guard}`);
      }
    }
  }
  const license = readFileSync(resolve(checkout.root, "LICENSE"), "utf8");
  if (!license.includes("MIT License") || !license.includes("Permission is hereby granted") ||
      !license.includes("Copyright GitHub, Inc.")) {
    throw new Error("gh-stack: upstream license changed");
  }
  const skill = parseSkill(resolve(skillRoot, "SKILL.md"));
  const version = (Bun.YAML.parse(readFileSync(resolve(skillRoot, "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---\n/)![1]) as
    { metadata?: { version?: unknown } }).metadata?.version;
  if (typeof version !== "string" || version.length === 0) throw new Error("gh-stack: skill version is missing");

  const target = resolve(repositoryRoot, "skills", "gh-stack");
  resetDirectory(target, "gh-stack");
  mkdirSync(resolve(target, "licenses"), { recursive: true });
  copyFileSync(resolve(checkout.root, "LICENSE"), resolve(target, "licenses", "gh-stack-LICENSE"));

  // Upstream names its references as code paths from the skill root. They become links next to the imported file.
  let body = skill.body.replace(/`references\/([a-z-]+)\.md`/g, (match, name: string) =>
    ghStackReferences.includes(name) ? `[${name}](${name}.md)` : match);
  for (const [from, to] of [
    ["Open the reference whose trigger matches the task; no need to preload all three.",
      "Open the reference whose trigger matches the task."],
    ["- `references/commands.md` — read when a command fails unexpectedly or you need its preconditions,\n  side effects, atomicity, or ordering guarantees.",
      "- `gh stack <command> --help` — run when a command fails unexpectedly or you need its flags."],
  ]) {
    if (!body.includes(from)) throw new Error(`gh-stack text changed upstream: ${from}`);
    body = body.replace(from, to);
  }
  if (body.includes("references/")) throw new Error("gh-stack: SKILL.md still names an unbundled reference path");
  writeMarkdown(resolve(target, "references", "gh-stack.md"), body, sourceName);
  for (const name of ghStackReferences) {
    const text = readFileSync(resolve(skillRoot, "references", `${name}.md`), "utf8");
    // A link to the excluded command reference, or to SKILL.md, needs a rewrite in this adapter.
    if (/\b(?:commands|SKILL)\.md\b/.test(text)) throw new Error(`gh-stack: references/${name}.md names a file this bundle moves or excludes`);
    writeMarkdown(resolve(target, "references", `${name}.md`), text, sourceName);
  }

  writeSkill(resolve(target, "SKILL.md"), frontmatter(
    "gh-stack",
    "Load this skill before you create, update, or merge pull requests that depend on each other, such as a pull request whose base is another pull request's branch, before you split work into several pull requests for review, or when the Git directory has a gh-stack file or the task names gh stack or stacked PRs. Covers creating a stack, adopting existing branches, adding layers, changes to a lower layer, submit, sync after a squash merge, merging a stack, rebase conflicts, worktrees, and exit codes.",
    sourceName, checkout.revision, { upstream_version: version }, "MIT",
  ), `# gh stack

\`gh stack\` is a GitHub CLI extension for stacked pull requests. A stack is a chain of branches on a trunk. Each branch has one pull request, and the base of that pull request is the branch below it. \`gh stack\` prints a stack bottom first: \`(main) <- auth <- api\`. \`auth\` is the bottom. It is based on \`main\` and merges first. \`api\` is the top. \`gh stack up\` moves toward the top, and \`gh stack down\` moves toward the trunk.

Let \`gh stack\` set the base of each pull request and rebase each layer. Do not set a base to another pull request's branch with \`gh pr create\` or \`gh pr edit\`, and do not rebase or cherry-pick the layers by hand.

## Run the forms that do not prompt

Under a terminal, a bare command opens a prompt or a full-screen TUI and waits forever. Always run the form in the first column.

| Run | Never run | Why |
|---|---|---|
| \`gh stack view --json\` | \`gh stack view\` | Opens a TUI. |
| \`gh stack submit --auto\` | \`gh stack submit\` | Prompts for the title of each new pull request. |
| \`gh stack merge <target> --yes\` | \`gh pr merge\` | \`gh pr merge\` cannot merge a stack. |
| \`gh stack init <branch>...\` | \`gh stack init\` | Prompts for branch names. |
| \`gh stack add <branch>\` | \`gh stack add\` | Prompts for a name. |
| \`gh stack checkout <target>\` | \`gh stack checkout\` | Opens a menu. |
| \`gh stack up\`, \`down\`, \`top\`, or \`bottom\` | \`gh stack switch\` | Menu only. |
| None | \`gh stack modify\` | TUI only. |

\`gh stack <command> --help\` is the authority for flags. \`gh stack help <command>\` prints only the top-level help.

\`gh stack view --json\` writes JSON to stdout and status messages to stderr. Parse only the JSON, and use the exit code to find a failure. \`branches[].needsRebase\` is true when a branch no longer contains the tip of its parent. \`branches[].pr.state\` is \`OPEN\`, \`MERGED\`, or \`QUEUED\`.

## Start a stack

Create the stack before you write code. Put one dependent concern in each layer, bottom to top. Read [stack-design](references/stack-design.md) to choose the layers.

\`\`\`bash
gh stack init auth          # create the stack and check out auth
git add <paths> && git commit -m "Add auth middleware"
gh stack add api            # next layer, branched from auth
git add <paths> && git commit -m "Add API routes"
gh stack submit --auto      # push every branch and open draft pull requests
gh stack view --json        # confirm the order and the pull requests
\`\`\`

## Adopt existing branches

A pull request whose base is another pull request's branch is a stack that \`gh stack\` does not track yet. Adopt the branches bottom to top, then let \`submit\` set each base and link the stack on GitHub:

\`\`\`bash
gh stack init [--base <trunk>] <bottom> ... <top>
gh stack submit --auto
\`\`\`

\`init\` adopts branches that exist, and the open pull requests stay. \`init\` changes only the stack metadata, not Git ancestry. When \`gh stack view --json\` shows \`needsRebase\` for a branch, run \`gh stack rebase\` before \`submit\`.

To reorder or rename layers, run \`gh stack unstack\`, fix the branches and their Git ancestry, then run \`init\` and \`submit --auto\` again. \`gh stack modify\` is TUI only. The full recipe is in [troubleshooting](references/troubleshooting.md#restructuring-a-stack).

## Change a lower layer

Commit a change on the layer that owns it, not on the top branch. Find the owner with \`gh stack view --json\`, or with \`git log --all -- <path>\`.

\`\`\`bash
gh stack checkout auth      # or gh stack down
git add <paths> && git commit -m "Fix token expiry"
gh stack rebase --upstack   # replay every branch above onto the change
gh stack top
gh stack push
\`\`\`

## Sync and merge

\`\`\`bash
gh stack sync               # fetch, rebase onto the trunk, push, refresh pull request state
gh stack sync --prune       # also delete local branches of merged pull requests
gh stack merge 42 --yes     # merge pull request 42 and every unmerged pull request below it
\`\`\`

- After a squash merge on GitHub, run \`gh stack sync\`. It skips the merged branch and rebases the layers above it.
- When the local stack and the stack on GitHub diverge, \`sync\` changes nothing and exits 0 with \`Sync aborted\`. Look for that message in the output. Then follow [troubleshooting](references/troubleshooting.md#local-and-remote-stacks-have-diverged).
- \`gh stack merge\` merges all of its pull requests or none. A stack number as the target merges the whole stack. Without \`--squash\`, \`--merge\`, or \`--rebase\`, it uses the last merge method again.

## Act on these exit codes

| Code | Meaning | Action |
|---|---|---|
| 3 | Rebase conflict | After \`gh stack rebase\`: resolve the files, run \`git add\`, then run \`gh stack rebase --continue\`. \`gh stack rebase --abort\` restores every branch. After \`gh stack sync\`: the stack is already restored. Run \`gh stack rebase\` to get the conflict again, then resolve it the same way. |
| 6 | The branch is in more than one stack, usually as their trunk. | Check out a branch that only one stack has, or give a stack number, as in \`gh stack merge 7 --yes\`. |
| 7 | A rebase is in progress. | Run \`gh stack rebase --continue\` or \`gh stack rebase --abort\`. |
| 8 | Another \`gh stack\` process has the lock on the stack file. | Wait about 5 seconds, then try again. Do not delete the lock files. |
| 9 | Stacked pull requests are not enabled on the repository. | Stop and tell the user. |

For another code, read stderr and the exit codes in [gh-stack](references/gh-stack.md#exit-codes).

## Worktrees

- All linked worktrees of a clone share one stack catalog.
- Navigation does not take over a branch that another worktree has checked out. To find that worktree, add \`--print-path\` and use stdout only on success: \`path=$(gh stack checkout api --print-path) && cd -- "$path"\`.
- \`rebase\` and \`sync\` update only clean worktrees, and they never stash. Commit the changes in a dirty worktree first.

## References

- [stack-design](references/stack-design.md): read before you plan a new stack, to choose the layers, name the branches, and decide when work needs its own stack.
- [troubleshooting](references/troubleshooting.md): read on a rebase conflict, after a squash merge, when the local and remote stacks diverge, before you restructure a stack, or when jj, Sapling, or git-town manage the branches.
- [gh-stack](references/gh-stack.md): the complete upstream skill. Read it for setup, more than one remote, merge queues, the full JSON fields, and the other exit codes.
`, sourceName);
  return ["gh-stack", ...ghStackReferences];
}

function assertApacheLicense(checkout: Checkout, name: string) {
  const license = readFileSync(resolve(checkout.root, "LICENSE"), "utf8");
  if (!license.includes("Apache License") || !license.includes("Version 2.0")) {
    throw new Error(`${name}: upstream license is no longer Apache-2.0`);
  }
}

// Apache-2.0 section 4 requires a copy of the license and any NOTICE file with redistributed work.
function copyApacheLicense(checkout: Checkout, name: "ax" | "convex" | "cloudflare"): string {
  const licenses = resolve(repositoryRoot, "skills", name, "licenses");
  mkdirSync(licenses, { recursive: true });
  copyFileSync(resolve(checkout.root, "LICENSE"), resolve(licenses, `${name}-LICENSE`));
  const notice = ["NOTICE", "NOTICE.md", "NOTICE.txt"].find((file) => existsSync(resolve(checkout.root, file)));
  if (!notice) return `retained in \`skills/${name}/licenses/${name}-LICENSE\``;
  copyFileSync(resolve(checkout.root, notice), resolve(licenses, `${name}-NOTICE`));
  return `retained in \`skills/${name}/licenses/${name}-LICENSE\`, with the upstream notice in \`skills/${name}/licenses/${name}-NOTICE\``;
}

const bundleNames = ["ax", "convex", "cloudflare", "expo", "clerk", "react-native", "design-engineering", "clarity", "agent-surf", "gh-stack"] as const;
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
  if (name !== "expo" && name !== "clerk" && name !== "gh-stack") assertApacheLicense(checkout, name);
  const adapters = { ax: syncAx, convex: syncConvex, cloudflare: syncCloudflare, expo: syncExpo, clerk: syncClerk, "gh-stack": syncGhStack };
  manifest[name].workflows = adapters[name](checkout);
  const apacheLicense = name === "ax" || name === "convex" || name === "cloudflare" ? copyApacheLicense(checkout, name) : "";
  manifest[name].revision = checkout.revision;
  console.log(`${name}: ${checkout.revision}`);
  const notices: Record<Exclude<BundleName, "react-native" | "design-engineering" | "clarity" | "agent-surf">, string> = {
    ax: `## Ax skill

The files under \`skills/ax/\` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision \`${checkout.revision}\`, licensed under Apache License 2.0, ${apacheLicense}.

The imported revision is dated ${checkout.date}. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, moves shared reference files to \`references/shared/\` with adjusted links, and records the source package version.
`,
    convex: `## Convex skill

The files under \`skills/convex/\` derive from [get-convex/agent-skills](https://github.com/get-convex/agent-skills) revision \`${checkout.revision}\`, licensed under Apache License 2.0, ${apacheLicense}.

The imported revision is dated ${checkout.date}. Flow Copilot combines the separate skills into one Agent Skills package, replaces top-level skill metadata with one router, moves capability instructions into references, and adjusts links for their new locations.
`,
    cloudflare: `## Cloudflare skill

The files under \`skills/cloudflare/\` derive from [cloudflare/skills](https://github.com/cloudflare/skills) revision \`${checkout.revision}\`, licensed under Apache License 2.0, ${apacheLicense}.

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
    "gh-stack": `## gh-stack skill

The files under \`skills/gh-stack/\` derive from [github/gh-stack](https://github.com/github/gh-stack) revision \`${checkout.revision}\`, licensed under the MIT License, retained in \`skills/gh-stack/licenses/gh-stack-LICENSE\`.

The imported revision is dated ${checkout.date}. Flow Copilot replaces the upstream skill entry with a shorter router that it writes itself, and moves the upstream \`SKILL.md\` into \`references/gh-stack.md\`. It imports the stack design and troubleshooting references, turns their code paths into links, and replaces the pointer to the command reference with \`gh stack <command> --help\`. The command reference is not imported.
`,
  };
  return notices[name];
}

try {
  const options = args.filter((arg) => arg !== "--update");
  if (options.length && (options.length !== 2 || options[0] !== "--only" || !bundleNames.includes(options[1] as BundleName))) {
    throw new Error(`Usage: bun run sync [--update] [--only ${bundleNames.join("|")}]`);
  }
  const selected = options.length ? [options[1] as BundleName] : bundleNames;
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
