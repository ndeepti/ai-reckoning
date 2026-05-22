# AI Reckoning — Demo Runbook & Presentation Guide

---

## Pre-Demo Checklist (run 10 min before presenting)

```bash
# 1. Start the app
cd /Users/dnagboth/Projects/Hackathon/incident-autopsy
npm run dev

# 2. Start the tunnel (keep terminal open)
cloudflared tunnel --url http://localhost:3000
# Current URL: https://burner-put-portion-gcc.trycloudflare.com

# 3. Verify server and data are ready
curl -s http://localhost:3000/api/logs | python3 -c "import sys,json; d=json.load(sys.stdin); print('Logs:', d['count'], 'lines')"
curl -s http://localhost:3000/api/teams | python3 -c "import sys,json; d=json.load(sys.stdin); print('Teams:', len(d), 'messages')"
curl -s -o /dev/null -w "Server: %{http_code}\n" http://localhost:3000

# 4. Seed Teams messages with correct timestamps (run after every server restart)
rm -f /tmp/teams-messages.json && sleep 1 && \
curl -s -X POST http://localhost:3000/api/teams/webhook \
  -H "Content-Type: application/json" \
  -d '{"channel":"chip1-releases","role":"Jenkins","text":"Deployed release/2026.05.20 — fn-connect 2026.05.20.2. DB changes: Connect (release/2026.05.20). Steps: DB scripts -> Redis cache refresh -> Deploy fn-connect -> Deploy fn-identity -> chip1 DB script -> chip1-account","isAlert":false,"time":"20:34"}' && \
curl -s -X POST http://localhost:3000/api/teams/webhook \
  -H "Content-Type: application/json" \
  -d '{"channel":"Chip1-Integration","role":"Engineer","text":"Getting STOCK_CODE_010 errors from fn-connect — Invalid PO id - 0 or PO line id - 0 on XCRM-prod calls. Started after release/2026.05.20 deployment. Entity ID mapping returning wrong contact records for accounts with duplicate contacts","isAlert":true,"time":"20:48"}' && \
curl -s -X POST http://localhost:3000/api/teams/webhook \
  -H "Content-Type: application/json" \
  -d '{"channel":"Chip1-Integration","role":"On-call","text":"Confirmed root cause — findUnifiedEntityMappingInfoByParent returns wrong record when account has duplicate contacts in entity_id_mapping table. PR #355 fix deploying now via release/2026.05.21","isAlert":false,"time":"20:55"}' && \
echo "Teams messages seeded"

# 5. Final check
curl -s http://localhost:3000/api/teams | python3 -c "
import sys,json
msgs=json.load(sys.stdin)
print(len(msgs), 'messages:')
[print(f'  [{m[\"time\"]}] {m[\"role\"]}: {m[\"text\"][:60]}') for m in msgs]
"
```

**Expected output:**
```
Logs: 150 lines
Teams: 3 messages
Server: 200
  [20:55] On-call: Confirmed root cause...
  [20:48] Engineer: Getting STOCK_CODE_010 errors...
  [20:34] Jenkins: Deployed release/2026.05.20...
Teams messages seeded
```

---

## Quick Debug

```bash
# Server not responding
pkill -f "next dev" && npm run dev

# Teams messages wrong or missing
rm -f /tmp/teams-messages.json
# restart server, then re-run seed commands above

# Run Reckoning gives 429 (payload too large)
curl -s http://localhost:3000/api/logs | python3 -c "import sys,json; d=json.load(sys.stdin); print('lines:', d['count'])"
# Must be <= 150. If higher, restart server.

# Check API key is set
grep -c "sk-" /Users/dnagboth/Projects/Hackathon/incident-autopsy/.env.local
# Must print 1

# Tunnel down
curl -s -o /dev/null -w "%{http_code}" https://burner-put-portion-gcc.trycloudflare.com/api/teams/webhook
# Must print 200. If not, restart tunnel.

# Log files missing
ls "/Users/dnagboth/Downloads/Logs-2026-05-21 20_36_37.txt"
ls "/Users/dnagboth/Downloads/Logs-2026-05-21 21_14_38.txt"
```

---

## The Presentation

### Opening (30 seconds)

> "Last night at 8:34pm, we deployed fn-connect.
> By 8:36, errors started spiking.
> By 9pm, error volume had tripled and was still climbing.
> One engineer spent 88 minutes figuring out what happened.
> Tonight we're going to show you how to do it in 4."

---

### Act 1 — The Incident (2 minutes)

This is a real incident from last night. Walk through the timeline:

| Time  | What happened |
|-------|--------------|
| 20:34 | Jenkins deploys `release/2026.05.20` — fn-connect `2026.05.20.2` |
| 20:35 | First errors: `STOCK_CODE_010: Invalid PO id - 0 or PO line id - 0` |
| 20:36 | Loki: error count jumps **950 → 2,549 per 2 minutes** (2.7× spike) |
| 20:48 | Engineer notices, reports in Chip1-Integration channel |
| 20:55 | On-call confirms root cause, PR #355 deploying |
| 21:00 | Errors still rising at 3,485/2min — fix not yet live |

**The bug — show this on screen:**

Before (release/2026.05.20 — buggy):
```java
Optional<EntityIdMapping> contactFromAccountOptional =
    entityIdMappingRepository.findUnifiedEntityMappingInfoByParent(
        sourceBusinessId, CONTACT, contactId, accountId);
return contactFromAccountOptional
    .map(entityIdMapping -> getOtherId(contactId, entityIdMapping))
    .map(Pair::getRight)
    .orElse(null);
// When duplicate contacts exist → returns WRONG record
// → getOtherId() returns 0 → XCRM rejects: STOCK_CODE_010
```

After (PR #355 — fix):
```java
List<EntityIdMapping> contactListFromAccount =
    entityIdMappingRepository.findAllUnifiedEntityMappingInfoByParent(...);
contactListFromAccount.sort(
    Comparator.comparing(EntityIdMapping::getCreatedTimestamp).reversed());
return getOtherId(contactId, contactListFromAccount.get(0)).getRight();
// UNION ALL query returns ALL matches → sort by timestamp → most recent wins
```

**The problem:** `findUnifiedEntityMappingInfoByParent` (Optional) returned
the wrong contact record for accounts with duplicates in `entity_id_mapping`.
Wrong record → wrong XCRM entity ID → `STOCK_CODE_010` on every stock code sync.

**88 minutes.** That's how long it took to find line 590 in EntityIdMappingUtil.java.

---

### Act 2 — The Demo (5 minutes)

**Open `http://localhost:3000`**

**INPUT DATA panel — show each tab:**

- **Logs**: "These are real fn-connect production logs. 140 out of 150 lines are errors.
  You can see `STOCK_CODE_010: Invalid PO id - 0` and `XCRM-prod 500` errors."

- **Metrics**: "This is real data from Loki — error count per 2 minutes.
  Flat baseline at ~950. At 20:36 it jumps to 2,549. At 21:00 it's still climbing to 3,485.
  That's not a mock chart — I exported it from Grafana this evening."

- **Teams**: "Three messages from our actual channels — Jenkins deploy notification at 20:34,
  engineer alert at 20:48, on-call confirming root cause at 20:55."

- **Diff**: "The actual git diff between release/2026.05.20 and release/2026.05.21.
  The fix is right there — switching from Optional to List with UNION ALL."

> "An engineer on-call has all four of these open in separate tabs.
> They're reading, searching, correlating, guessing. That's the 88 minutes."

**Click "Run Reckoning"**

*While agent steps stream in the middle panel, narrate:*
- Step 1-2: "Reading the logs — 150 lines, error pattern identified"
- Step 3-4: "Metrics — spike at 20:36, correlating with deploy timestamp"
- Step 5: "Teams thread — engineer noticed at 20:48, 12 minutes after spike"
- Step 6: "Causal chain — deploy triggers duplicate contact lookup failure"
- Step 7-8: "Root cause — exact file, exact method, exact line"

**Analysis report appears:**

1. **Root Cause tab**:
   - `EntityIdMappingUtil.java:590` — this is the real line number from the real codebase
   - HIGH confidence
   - Causal chain: deploy → wrong entity mapping → invalid PO IDs → XCRM rejects → error spike

2. **Timeline tab**:
   - Chronological from 20:34 to 21:00
   - All timestamps from real data — logs, metrics, Teams

3. **Insights tab**:
   - Duplicate contacts in entity_id_mapping (the data condition)
   - Lack of validation for duplicates (the code gap)
   - Detection gap — no alerting for entity ID failures before volume threshold

4. **Actionables tab**:
   - URGENT: Fix already deployed via PR #355
   - TODO: Add tests for duplicate contact scenarios
   - WATCH: Monitor error rates post-deployment

> "That's the answer. Same answer the engineer found after 88 minutes.
> The AI found it in 4. And it's documented. Instantly."

---

### Act 3 — Architecture (1 minute)

```
Real Production Data              AI Reckoning
────────────────────              ──────────────────────────────────
fn-connect logs (Loki)    ──►   /api/logs      ─┐
Loki metrics (exported)   ──►   liveData.ts     ├──► GPT-4o streaming
Teams channels (PA hook)  ──►   /api/teams     ─┤         │
Git diff (fn-connect)     ──►   liveData.ts    ─┘         ▼
                                               Structured Incident Report
```

**Stack:** Next.js · TypeScript · GPT-4o streaming · Recharts · Power Automate · Cloudflare Tunnel

**What makes it different from grep or a dashboard:**
- Correlates *across* 4 sources simultaneously — not just searching
- Constructs a *causal chain* — not just listing errors
- Outputs *actionable structure* — root cause, timeline, gaps, next steps
- Works on any incident — feed it different logs, get a different report

---

### Closing (30 seconds)

> "Every incident like this costs engineering time, customer trust, and sleep.
> The investigation itself doesn't have to.
>
> AI Reckoning turns 88 minutes of manual correlation into a 4-minute report.
> The engineer still makes the decision. The AI does the detective work.
>
> This ran on last night's real incident. It'll run on the next one too."

**Footer on screen:** `Manual investigation 88 min → ~4 min with AI Reckoning`

---

## Demo Flow Quick Reference

| # | Click / Action | Say |
|---|---------------|-----|
| 1 | Open localhost:3000 | "Real production data — fn-connect incident from last night" |
| 2 | Logs tab | "150 lines, 140 errors — STOCK_CODE_010 and XCRM 500s" |
| 3 | Metrics tab | "Loki data — 950 baseline, 2,549 spike at 20:36" |
| 4 | Teams tab | "Jenkins deploy, engineer alert, on-call fix — all timestamped" |
| 5 | Diff tab | "The actual fix — Optional → List, UNION ALL" |
| 6 | Run Reckoning | "AI correlating all four sources simultaneously" |
| 7 | Steps stream | "Reading... correlating... causal chain forming..." |
| 8 | Root Cause | "EntityIdMappingUtil.java:590 — HIGH confidence" |
| 9 | Timeline | "20:34 deploy → 20:36 spike → 20:48 alert → 20:55 fix" |
| 10 | Insights | "Detection gap — this is what we need to fix next" |
| 11 | Actionables | "Prioritised — URGENT/WATCH/TODO" |
| 12 | Footer | "88 min → 4 min" |
