import { describe, expect, test } from "bun:test";
import { parseClaudeTranscript } from "./src/claude";
import { parseCodexTranscript } from "./src/codex";
import { deliveredReads, guideCommands, isReadOnlyCommand, scoreReads, sectionsFor, type Task } from "./src/trigger";

describe("read-only command classification", () => {
  test("accepts reads, searches, and CLI guide commands", () => {
    for (const command of [
      "cat .agents/skills/agent-surf/SKILL.md",
      `/bin/zsh -lc "sed -n '1,80p' references/core/index.md"`,
      `/bin/zsh -lc "rg --files '/tmp/x/.agents/skills' | rg 'agent-desktop/(agent-desktop|agent-desktop-macos)/index.md'"`,
      "ls -la && cat package.json 2>/dev/null",
      "which agent-desktop && agent-desktop skills get desktop 2>&1 | head -150",
      "npx agent-browser skills get core --full",
      "agent-device help gestures",
      "command -v agent-browser",
      "ls -la; which agent-device; ls /tmp; printenv PATH",
      "npx -y agent-desktop status 2>&1 | head -30",
    ]) expect(isReadOnlyCommand(command)).toBe(true);
  });

  test("rejects writes, edits, substitutions, and other programs", () => {
    for (const command of [
      "echo 7006652 > result.txt",
      "sed -i '' 's/a/b/' file.md",
      "agent-desktop launch Calculator",
      "agent-browser open https://shop.example.test/products/42",
      "cat $(ls)",
      "npm install",
      "find . -delete",
      "git commit -m x",
      "sleep 5 &",
    ]) expect(isReadOnlyCommand(command)).toBe(false);
  });

  test("lists the guide commands in a script", () => {
    expect(guideCommands("which agent-desktop && agent-desktop skills get desktop 2>&1 | head -150"))
      .toEqual(["agent-desktop skills get desktop"]);
    expect(guideCommands("cat SKILL.md")).toEqual([]);
  });
});

describe("sections", () => {
  const text = ["# Title", "intro", "## Install", "step", "```sh", "# not a heading", "```", "## Use", "run", "## Debug", "fix"].join("\n");

  test("returns the headings a range covers and the heading in effect at its start", () => {
    expect(sectionsFor(text, [1, 4])).toEqual(["Title", "Install"]);
    expect(sectionsFor(text, [4, 9])).toEqual(["Install", "Use"]);
    expect(sectionsFor(text, [8, null])).toEqual(["Use", "Debug"]);
    expect(sectionsFor(text, [11, 11])).toEqual(["Debug"]);
  });
});

describe("scoring", () => {
  const task: Task = {
    id: "t", prompt: "p", fixture: "f", expectedBundles: ["agent-surf"],
    requiredReferences: { "agent-surf": ["references/a.md", "references/b.md"] },
    allowedReferences: { "agent-surf": ["references/a.md", "references/b.md", "references/c.md"] },
  };
  const read = (bundle: string, path: string) => ({ bundle, path, tool: "Read", complete: true });

  test("scores expected loads, required reads, extra references, and other bundles", () => {
    expect(scoreReads(task, [read("agent-surf", "SKILL.md"), read("agent-surf", "references/a.md"), read("agent-surf", "references/d.md"), read("expo", "SKILL.md")]))
      .toEqual({
        bundles: ["agent-surf", "expo"],
        expectedLoaded: true,
        requiredRead: ["agent-surf/references/a.md"],
        requiredMissed: ["agent-surf/references/b.md"],
        outsideAllowed: ["agent-surf/references/d.md"],
        otherBundles: ["expo"],
      });
  });

  test("never marks a negative control as loaded", () => {
    const control = { ...task, expectedBundles: [], requiredReferences: {}, allowedReferences: {} };
    expect(scoreReads(control, [read("agent-surf", "SKILL.md")]).expectedLoaded).toBe(false);
    expect(scoreReads(control, [read("agent-surf", "SKILL.md")]).otherBundles).toEqual(["agent-surf"]);
  });
});

describe("delivered reads", () => {
  const skill = "/w/.claude/skills/agent-surf/references/agent-desktop";
  const command = `cd ${skill}; cat agent-desktop/index.md | head -80; which agent-desktop`;
  const output = "Exit code 1\n<!-- Modified by Flow Copilot from vercel-labs/agent-desktop revision abc. -->\n# agent-desktop";

  test("counts reads before a failed step when the output shows bundled content", () => {
    const events = [
      { type: "assistant", message: { content: [{ type: "tool_use", id: "1", name: "Bash", input: { command } }] } },
      { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "1", is_error: true, content: output }] } },
    ];
    expect(parseClaudeTranscript(events)).toEqual([]);
    expect(parseClaudeTranscript(deliveredReads(events, "claude")).map((read) => read.path))
      .toEqual(["references/agent-desktop/agent-desktop/index.md"]);
  });

  test("keeps failed Codex commands without bundled output as failures", () => {
    const event = { type: "item.completed", item: { id: "1", type: "command_execution", command: `cat ${skill}/x.md`, exit_code: 1, status: "failed", aggregated_output: "No such file" } };
    expect(parseCodexTranscript(deliveredReads([event], "codex"))).toEqual([]);
    const shown = { ...event, item: { ...event.item, aggregated_output: output } };
    expect(parseCodexTranscript(deliveredReads([shown], "codex")).map((read) => read.path)).toEqual(["references/agent-desktop/x.md"]);
  });
});
