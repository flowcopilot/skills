import json, statistics as st, collections
from parse import all_runs, S
runs = all_runs()
for r in runs:
    p = S/"judge"/f"{r['case']}__{r['layout']}__{r['rep']}.json"
    r["score"] = json.loads(p.read_text())["structured"]["score"] if p.exists() else None
json.dump([{k:v for k,v in r.items()} for r in runs], open(S/"results.json","w"), indent=1)
def summ(rs):
    pos=[r for r in rs if r["bundle"]]; neg=[r for r in rs if not r["bundle"]]
    return dict(n=len(rs), ok=sum(r["ok"] for r in rs),
      right_bundle=f"{sum(r['right_bundle'] for r in pos)}/{len(pos)}",
      target=f"{sum(r['target_loaded'] for r in pos)}/{len(pos)}",
      false_trig=f"{sum(r['false_trigger'] for r in neg)}/{len(neg)}" if neg else "-",
      score=round(st.mean(r["score"] for r in pos),2) if pos else None,
      in_tok_pos=round(st.mean(r["input_tokens"] for r in pos)) if pos else None,
      in_tok_neg=round(st.mean(r["input_tokens"] for r in neg)) if neg else None,
      cost_pos=round(st.mean(r["cost_usd"] for r in pos),4) if pos else None,
      cost_neg=round(st.mean(r["cost_usd"] for r in neg),4) if neg else None,
      calls=round(st.mean(r["tool_calls"] for r in pos),2) if pos else None,
      dur=round(st.mean(r["duration_s"] for r in pos),1) if pos else None)
for L in ("combined","upstream"): print(L, summ([r for r in runs if r["layout"]==L]))
print()
for b in ["ax","cloudflare","convex","expo","react-native"]:
    for L in ("combined","upstream"):
        s=summ([r for r in runs if r["layout"]==L and r["bundle"]==b]); print(b,L,s["target"],s["score"],s["in_tok_pos"],s["cost_pos"])
print()
bycase=collections.defaultdict(dict)
for r in runs:
    if r["bundle"]: bycase[r["case"]].setdefault(r["layout"],[]).append((int(r["target_loaded"]), r["score"]))
for c,d in bycase.items():
    print(c, {L:(sum(t for t,_ in v), [s for _,s in v]) for L,v in d.items()})
print()
# score conditional on target loaded
for L in ("combined","upstream"):
    for t in (True,False):
        xs=[r["score"] for r in runs if r["layout"]==L and r["bundle"] and r["target_loaded"]==t]
        print(L,"loaded" if t else "not loaded", len(xs), round(st.mean(xs),2) if xs else None)
# stale skill calls in combined
bad=[(r["case"],r["rep"],s) for r in runs if r["layout"]=="combined" for s in r["skills"] if s not in ("ax","cloudflare","convex","expo","react-native")]
print("combined non-existent skill calls:", bad)
