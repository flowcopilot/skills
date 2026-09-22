// Ignore code examples: C++ lambdas such as [](int value) are not Markdown links.
export function markdownLinks(text: string): string[] {
  let fence: { character: string; length: number } | undefined;
  const prose: string[] = [];
  for (const line of text.split("\n")) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) {
        fence = undefined;
      }
      continue;
    }
    if (marker) {
      fence = { character: marker[1][0], length: marker[1].length };
      continue;
    }
    prose.push(line);
  }
  const withoutCode = prose.join("\n").replace(/(`+)([\s\S]*?)\1/g, "");
  return [...withoutCode.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
}
