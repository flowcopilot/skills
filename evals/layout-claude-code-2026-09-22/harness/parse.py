import json, pathlib, re

S = pathlib.Path(__file__).parent
REPO = pathlib.Path("/Users/tudor/cave/flow-skills")
BUNDLES = ["ax", "cloudflare", "convex", "expo", "react-native"]
UP2B = {}
for line in open(S / "upstream-map.txt"):
    b, n = line.split()
    UP2B[n] = b
CASES = {c["id"]: c for c in json.load(open(S / "cases.json"))}


def parse(path):
    cid, layout, rep = path.stem.split("__")
    c = CASES[cid]
    skills, reads, result, n_tools, failed_skill = [], [], None, 0, 0
    for line in open(path):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if e.get("type") == "assistant":
            for b in e["message"].get("content", []):
                if b.get("type") == "tool_use":
                    n_tools += 1
                    i = b.get("input", {})
                    if b["name"] == "Skill":
                        skills.append(i.get("skill") or i.get("command") or "")
                    elif b["name"] == "Read":
                        reads.append(i.get("file_path", ""))
                    else:
                        reads.append(i.get("path", "") + " " + i.get("pattern", ""))
        if e.get("type") == "user":
            for b in e["message"].get("content", []):
                if isinstance(b, dict) and b.get("type") == "tool_result" and "Unknown skill" in str(b.get("content")):
                    failed_skill += 1
        if e.get("type") == "result":
            result = e

    def rel(p):
        m = re.search(r"\.claude/skills/(.*)", p)
        return m.group(1) if m else None

    rels = [r for r in map(rel, reads) if r]
    touched = set()
    for s in skills:
        s = s.lstrip("/")
        if layout.startswith("combined") and s in BUNDLES:
            touched.add(s)
        if layout == "upstream" and s in UP2B:
            touched.add(UP2B[s])
    for r in rels:
        top = r.split("/")[0]
        if layout.startswith("combined") and top in BUNDLES:
            touched.add(top)
        if layout == "upstream" and top in UP2B:
            touched.add(UP2B[top])
    if layout.startswith("combined"):
        hit = any(t in r for r in rels for t in c["combined"])
    else:
        hit = any(s.lstrip("/") in c["upstream"] for s in skills) or any(r.split("/")[0] in c["upstream"] for r in rels)
    u = (result or {}).get("usage", {})
    return {
        "case": cid, "bundle": c["bundle"], "layout": layout, "rep": int(rep),
        "ok": bool(result) and not result.get("is_error"),
        "skills": skills, "reads": rels, "touched": sorted(touched),
        "right_bundle": c["bundle"] in touched if c["bundle"] else None,
        "target_loaded": hit if c["bundle"] else None,
        "false_trigger": bool(touched) if not c["bundle"] else None,
        "tool_calls": n_tools, "failed_skill_calls": failed_skill,
        "input_tokens": u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0),
        "output_tokens": u.get("output_tokens", 0),
        "cost_usd": (result or {}).get("total_cost_usd"),
        "duration_s": ((result or {}).get("duration_ms") or 0) / 1000,
        "answer": (result or {}).get("result", ""),
    }


def all_runs(runs_dir="runs"):
    return [parse(p) for p in sorted((S / runs_dir).glob("*.jsonl"))]


if __name__ == "__main__":
    for r in all_runs():
        print(r["case"], r["layout"], r["rep"], r["ok"], r["touched"], r["target_loaded"], r["false_trigger"], r["tool_calls"], r["input_tokens"], r["cost_usd"], r["skills"], r["reads"][:4])
