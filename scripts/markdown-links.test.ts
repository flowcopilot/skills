import { expect, test } from "bun:test";
import { markdownLinks } from "./markdown-links";

test("keeps real links while ignoring C++ lambdas and inline code", () => {
  expect(markdownLinks([
    "[guide](references/guide.md#example)",
    "```cpp",
    "auto callback = [](jsi::Runtime& rt) {};",
    "[not a link](missing.md)",
    "```",
    "Inline `[](bool ascii)` and `[example](missing.md)`.",
    "[`other guide`](../other/index.md)",
  ].join("\n"))).toEqual(["references/guide.md#example", "../other/index.md"]);
});

test("handles tilde fences and shorter nested fences", () => {
  expect(markdownLinks([
    "~~~~text",
    "~~~",
    "[code](missing.md)",
    "~~~~",
    "[real](present.md)",
    "````markdown",
    "```js",
    "[code](missing.md)",
    "```",
    "````",
    "[last](last.md)",
  ].join("\n"))).toEqual(["present.md", "last.md"]);
});
