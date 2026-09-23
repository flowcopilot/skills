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
  bundle?: string;
};
type Manifest = Record<"ax" | "cloudflare" | "convex" | "expo" | "software-mansion" | "callstack", SourceConfig>;
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
  const workflows = sourceMarkdownSkills(
    resolve(checkout.root, "src", "ax", "skills"),
  );
  if (!workflows.some((skill) => skill.name === "ax-llm")) {
    throw new Error("Ax source has no ax-llm skill");
  }

  const references = resolve(target, "references");
  mkdirSync(references, { recursive: true });
  for (const skill of workflows) {
    writeMarkdown(
      resolve(references, `${skill.name}.md`),
      skill.body.replaceAll("__VERSION__", version),
      sourceName,
      checkout.revision,
    );
  }

  const metadata = frontmatter(
    "ax",
    "Build, review, debug, and optimize TypeScript LLM applications with @ax-llm/ax. Use for Ax signatures, model providers, structured generation, agents, context, memory, MCP, workflows, events, audio, observability, GEPA, refinement, or playbooks.",
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
      skill.body.replace(/(?:\.\/)?references\//g, `${skill.name}/`),
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
    "If a named skill is unavailable, use the relevant product docs through the [Cloudflare directory](https://developers.cloudflare.com/directory/); sibling skills are optional.",
    "If no bundled reference covers the product, use the relevant product docs through the [Cloudflare directory](https://developers.cloudflare.com/directory/).",
  );
  rootBody = replaceExact(rootBody, "| Skill or reference |", "| Reference |");
  const staleMention = rootBody.match(/`([a-z0-9-]+)` skill|named skill/);
  if (staleMention) throw new Error(`Cloudflare router still names a skill: ${staleMention[0]}`);
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
  writeSkill(resolve(target, "SKILL.md"), frontmatter(
    "expo",
    "Build, debug, upgrade, and deploy Expo apps and operate Expo Application Services (EAS). Use when the task mentions Expo or EAS, or the project has an expo dependency; includes routing, native UI, native modules, web migrations, builds, hosting, updates, and monitoring.",
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

function syncReactNative(checkouts: Record<typeof reactNativeSources[number], Checkout>): string {
  const bundle = "react-native";
  const target = resolve(repositoryRoot, "skills", bundle);
  const imports = reactNativeSources.map((name) => {
    const checkout = checkouts[name];
    const sourceRoot = resolve(checkout.root, "skills");
    const files = filesUnder(sourceRoot).filter((path) => !relativePath(path, sourceRoot).split("/").includes("agents"));
    const skills = files.filter((path) => basename(path) === "SKILL.md").map((path) => ({
      ...parseSkill(path),
      path: relativePath(path, sourceRoot).replace(/SKILL\.md$/, "index.md"),
    })).sort((a, b) => a.path.localeCompare(b.path));
    if (!skills.some((skill) => skill.path === "react-native-best-practices/index.md")) {
      throw new Error(`${name}: missing react-native-best-practices skill`);
    }
    // A source must never overwrite its own index or another source's files.
    const destinations = files.map((path) => relativePath(path, sourceRoot).replace(/(^|\/)SKILL\.md$/, "$1index.md"));
    if (new Set(destinations).size !== destinations.length) {
      throw new Error(`${name}: SKILL.md to index.md collision`);
    }
    if (name === "software-mansion") {
      const metadata = JSON.parse(readFileSync(resolve(checkout.root, ".claude-plugin", "marketplace.json"), "utf8"));
      const plugin = metadata.plugins?.find((plugin: { name: string }) => plugin.name === "skills");
      if (plugin?.license !== "MIT") throw new Error("Software Mansion plugin license changed");
    } else {
      const license = readFileSync(resolve(checkout.root, "LICENSE"), "utf8");
      if (!license.includes("MIT License") || !license.includes("Permission is hereby granted")) {
        throw new Error("Callstack license changed");
      }
    }
    return { name, checkout, sourceRoot, files, skills };
  });
  resetDirectory(target, bundle);
  const sections: string[] = [];
  const notices: string[] = [];
  mkdirSync(resolve(target, "licenses"), { recursive: true });
  for (const { name, checkout, sourceRoot, files, skills } of imports) {
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
    const label = name === "software-mansion" ? "Software Mansion" : "Callstack";
    const routes = skills.map((skill) => {
      const description = skill.description.split(/\.\s/)[0].replace(/\s+/g, " ");
      return `- [${skill.name}](references/${name}/${skill.path}): ${description}.`;
    }).join("\n");
    sections.push(`## ${label}\n\n${routes}`);
    manifest[name].bundle = bundle;
    manifest[name].revision = checkout.revision;
    manifest[name].workflows = skills.map((skill) => `${name}/${skill.path.replace(/\.md$/, "")}`);
    const licenseFile = name === "software-mansion" ? "software-mansion-marketplace.json" : "callstack-LICENSE";
    copyFileSync(resolve(checkout.root, name === "software-mansion" ? ".claude-plugin/marketplace.json" : "LICENSE"), resolve(target, "licenses", licenseFile));
    notices.push(`### ${label}\n\nImported from [${sourceName}](https://github.com/${sourceName}) revision \`${checkout.revision}\`, dated ${checkout.date}. ${name === "software-mansion" ? "The upstream plugin metadata declares MIT; the repository provides no standalone LICENSE file. Its declaration and author metadata are retained" : "The upstream MIT license and copyright notice are retained"} in \`skills/${bundle}/licenses/${licenseFile}\`.`);
  }
  const first = checkouts["software-mansion"];
  writeSkill(resolve(target, "SKILL.md"), frontmatter(bundle,
    "Build, review, profile, and upgrade React Native apps with Software Mansion and Callstack guidance. Use for React Native performance, animations, gestures, native integration, navigation, TV, migration, and related libraries used by the project.",
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

function assertApacheLicense(checkout: Checkout, name: string) {
  const license = readFileSync(resolve(checkout.root, "LICENSE"), "utf8");
  if (!license.includes("Apache License") || !license.includes("Version 2.0")) {
    throw new Error(`${name}: upstream license is no longer Apache-2.0`);
  }
}

const bundleNames = ["ax", "convex", "cloudflare", "expo", "react-native"] as const;
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
  const checkout = clone(name);
  if (name !== "expo") assertApacheLicense(checkout, name);
  const adapters = { ax: syncAx, convex: syncConvex, cloudflare: syncCloudflare, expo: syncExpo };
  manifest[name].workflows = adapters[name](checkout);
  manifest[name].revision = checkout.revision;
  console.log(`${name}: ${checkout.revision}`);
  const notices: Record<Exclude<BundleName, "react-native">, string> = {
    ax: `## Ax skill

The files under \`skills/ax/\` derive from [ax-llm/ax](https://github.com/ax-llm/ax) revision \`${checkout.revision}\`, licensed under Apache License 2.0.

The imported revision is dated ${checkout.date}. Flow Copilot combines the TypeScript skills into one Agent Skills package, replaces their top-level metadata with one router, moves each skill's instructions into a reference, and records the source package version.
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

The imported revision is dated ${checkout.date}. Flow Copilot combines all skills from plugins/expo/skills into one Agent Skills package, uses the directory README index as the router, moves workflow instructions and supporting files into references, adjusts paths, and preserves helper scripts. Plugin metadata and hooks are not imported.
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
