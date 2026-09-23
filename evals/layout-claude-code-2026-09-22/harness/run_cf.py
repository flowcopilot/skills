import json, subprocess, sys, pathlib
from concurrent.futures import ThreadPoolExecutor

S = pathlib.Path(__file__).parent
MODEL = "claude-sonnet-5"
REPS = 5
SUFFIX = "\n\nDo not edit files. Keep the answer under 400 words."
cases = json.load(open(S / "cases.json"))
(S / "runs-cf").mkdir(exist_ok=True)

jobs = [(c, layout, r) for r in range(REPS) for c in cases if c["bundle"] == "cloudflare" for layout in ("combined", "combined-v2", "upstream")]


def run(job):
    c, layout, r = job
    out = S / "runs-cf" / f"{c['id']}__{layout}__{r}.jsonl"
    if out.exists() and '"type":"result"' in out.read_text():
        return
    cmd = ["claude", "-p", c["prompt"] + SUFFIX, "--model", MODEL,
           "--setting-sources", "project", "--tools", "Skill,Read,Glob,Grep",
           "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
           "--output-format", "stream-json", "--verbose",
           "--no-session-persistence", "--max-budget-usd", "1.5"]
    with open(out, "w") as f:
        subprocess.run(cmd, cwd=S / "cases" / layout, stdout=f, stderr=subprocess.DEVNULL, timeout=600)
    print("done", out.name, flush=True)


with ThreadPoolExecutor(6) as ex:
    list(ex.map(run, jobs))
