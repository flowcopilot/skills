"""Blind judge: scores each positive-case answer against the target reference text."""
import json, pathlib, subprocess, random, sys
from concurrent.futures import ThreadPoolExecutor
from parse import all_runs, CASES, REPO, S

JUDGE_MODEL = "claude-sonnet-5"
RUNS = sys.argv[1] if len(sys.argv) > 1 else "runs"
JUDGE = S / ("judge" if RUNS == "runs" else f"judge-{RUNS}")
JUDGE.mkdir(exist_ok=True)
SCHEMA = json.dumps({"type": "object", "properties": {
    "score": {"type": "integer", "minimum": 0, "maximum": 4},
    "missed": {"type": "array", "items": {"type": "string"}},
    "contradictions": {"type": "array", "items": {"type": "string"}}},
    "required": ["score", "missed", "contradictions"]})


def ref_text(c):
    p = c["combined"][0]
    base = REPO / "skills" / p
    for cand in (base, base.with_suffix(".md") if not p.endswith(".md") else base, base / "index.md"):
        if cand.is_file():
            return cand.read_text()[:40000]
    raise FileNotFoundError(p)


def judge(r):
    out = JUDGE / f"{r['case']}__{r['layout']}__{r['rep']}.json"
    if out.exists():
        return
    c = CASES[r["case"]]
    prompt = f"""You grade an assistant's answer against vendor reference guidance. You do not know how the answer was produced.

<task>{c['prompt']}</task>

<reference>
{ref_text(c)}
</reference>

<answer>
{r['answer']}
</answer>

Score 0-4:
4 = uses the reference's specific recommended approach, APIs, and commands; no contradictions.
3 = mostly follows the reference; misses one important specific point.
2 = generic but workable; misses several reference-specific points.
1 = uses an outdated or non-recommended approach for an important part.
0 = contradicts the reference on the core approach, or is unusable.
List the key reference points the answer missed and any direct contradictions (short phrases)."""
    p = subprocess.run(["claude", "-p", prompt, "--model", JUDGE_MODEL, "--tools", "", "--setting-sources", "project",
                        "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--no-session-persistence",
                        "--output-format", "json", "--json-schema", SCHEMA],
                       cwd=S / "cases" / "none", capture_output=True, text=True, timeout=600)
    res = json.loads(p.stdout)
    if isinstance(res, list):
        res = next(e for e in reversed(res) if e.get("type") == "result")
    out.write_text(json.dumps({"structured": res.get("structured_output"), "cost": res.get("total_cost_usd")}))
    print("judged", out.name, flush=True)


runs = [r for r in all_runs(RUNS) if r["bundle"] and r["ok"]]
random.shuffle(runs)
with ThreadPoolExecutor(6) as ex:
    list(ex.map(judge, runs))
