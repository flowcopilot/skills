import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function markdownLinks(markdown: string): string[] {
  let fence = "";
  let listIndent = 0;
  let blank = true;
  let indentedCode = false;
  const text = markdown.replace(/<!--[^]*?-->/g, "").split("\n").map((line) => {
    const indent = line.match(/^\s*/)?.[0].replace(/\t/g, "    ").length ?? 0;
    const list = line.match(/^( *)(?:[-+*]|\d+[.)]) +/);
    if (list && !fence) listIndent = list[0].length;
    else if (line.trim() && indent < listIndent) listIndent = 0;
    const marker = line.slice(list ? 0 : listIndent).match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = "";
      return "";
    }
    if (marker) {
      fence = marker[1];
      blank = true;
      return "";
    }
    if (!line.trim()) {
      blank = true;
      return "";
    }
    if (indent >= listIndent + 4 && (blank || indentedCode)) {
      indentedCode = true;
      return "";
    }
    blank = false;
    indentedCode = false;
    return line;
  }).join("\n").replace(/(`+)([^]*?)\1(?!`)/g, "");
  const definitions = new Map<string, string>();
  const label = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const body = text.replace(
    /^ {0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+)).*$/gm,
    (_, name: string, angle: string, bare: string) => {
      if (!definitions.has(label(name))) definitions.set(label(name), angle ?? bare);
      return "";
    },
  );
  const links: string[] = [];
  const remaining = body.replace(
    /(?<!\\)(!?)\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|((?:\\.|[^\s()\\]|\([^()\n]*\))+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)/g,
    (_, image: string, angle: string, bare: string) => {
      if (!image) links.push(angle ?? bare);
      return "";
    },
  );
  for (const match of remaining.matchAll(/(?<!\\)(!?)\[([^\]\n]+)\](?:\[([^\]\n]*)\])?/g)) {
    const target = definitions.get(label(match[3] || match[2]));
    if (!match[1] && target) links.push(target);
  }
  return links.map((link) => link.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, "$1"));
}

// Upstream routers list references as a directory tree in a code block: a `folder/` line,
// then indented bare file names. This returns those names joined with their folders.
export function treeMentions(text: string): string[] {
  const mentions: string[] = [];
  let fence = "";
  let folders: { indent: number; name: string }[] = [];
  for (const line of text.split("\n")) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) [fence, folders] = [marker[1], []];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = "";
      continue;
    }
    if (!fence) continue;
    const item = line.match(/^([\s|`├└│─-]*)([\w.-]+(?:\/[\w.-]+)*)(\/)?(?=\s|$)/);
    if (!item) continue;
    const indent = item[1].length;
    while (folders.length > 0 && folders.at(-1)!.indent >= indent) folders.pop();
    if (item[3]) folders.push({ indent, name: item[2] });
    else if (item[2].endsWith(".md") && folders.length > 0) {
      mentions.push([...folders.map((folder) => folder.name), item[2]].join("/"));
    }
  }
  return mentions;
}

export function reachableMarkdown(entry: string, files: string[]): Set<string> {
  const available = new Set(files);
  const reached = new Set<string>();
  const pending = [entry];
  const bases = [resolve(dirname(entry), "references"), dirname(entry)];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (reached.has(file) || !available.has(file)) continue;
    reached.add(file);
    const text = readFileSync(file, "utf8");
    // Upstream skills often name references as code or plain paths, and agents follow those too.
    const mentions = [...text.matchAll(/(?<![\w./:-])(?:\.{1,2}\/)?[\w-]+(?:\/[\w.-]+)*\.md\b/g)].map(([mention]) => mention);
    for (const mention of [...mentions, ...treeMentions(text)]) {
      const target = [dirname(file), ...bases].map((base) => resolve(base, mention)).find((path) => available.has(path));
      if (target) pending.push(target);
    }
    for (const link of markdownLinks(text)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(link)) continue;
      try {
        pending.push(resolve(dirname(file), decodeURIComponent(link.split(/[?#]/)[0])));
      } catch {
        throw new Error(`${file}: invalid Markdown link ${link}`);
      }
    }
  }
  return reached;
}
