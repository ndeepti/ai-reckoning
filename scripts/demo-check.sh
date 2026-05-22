#!/usr/bin/env bash
# Pre-demo health check — run before presenting

BASE="http://localhost:3000"
PASS="✅" FAIL="❌" WARN="⚠️ "

ok=0; fail=0

check() {
  local label="$1" result="$2" detail="$3"
  if [ "$result" = "ok" ]; then
    echo "$PASS $label${detail:+  ($detail)}"
    ((ok++))
  else
    echo "$FAIL $label${detail:+  → $detail}"
    ((fail++))
  fi
}

echo ""
echo "══════════════════════════════════════"
echo "  AI RECKONING — PRE-DEMO CHECK"
echo "══════════════════════════════════════"
echo ""

# 1. Dev server
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$BASE")
[ "$HTTP" = "200" ] && check "Dev server running" "ok" "localhost:3000" \
                     || check "Dev server running" "fail" "not responding — run: npm run dev"

# 2. Log file exists
LOG_FILE="/Users/dnagboth/Downloads/Logs-2026-05-21 20_36_37.txt"
[ -f "$LOG_FILE" ] && check "Log file present" "ok" "$(wc -l < "$LOG_FILE" | tr -d ' ') lines" \
                    || check "Log file present" "fail" "missing: $LOG_FILE"

# 3. Logs API
LOGS=$(curl -s --max-time 5 "$BASE/api/logs" 2>/dev/null)
COUNT=$(echo "$LOGS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null)
if [ -n "$COUNT" ] && [ "$COUNT" -gt 0 ] 2>/dev/null; then
  check "Logs API" "ok" "$COUNT lines (≤150)"
  [ "$COUNT" -gt 150 ] && echo "   $WARN count >150 — may hit token limit"
else
  check "Logs API" "fail" "returned 0 lines or error: $(echo "$LOGS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','?'))" 2>/dev/null)"
fi

# 4. Teams store has messages
TEAMS=$(curl -s --max-time 5 "$BASE/api/teams" 2>/dev/null)
TMSG=$(echo "$TEAMS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('messages',d if isinstance(d,list) else [])))" 2>/dev/null)
if [ -n "$TMSG" ] && [ "$TMSG" -gt 0 ] 2>/dev/null; then
  check "Teams messages" "ok" "$TMSG messages in store"
else
  check "Teams messages" "fail" "store empty — run seed commands from DEMO.md"
fi

# 5. OpenAI key set
KEY=$(grep -c "OPENAI_API_KEY.*sk-" /Users/dnagboth/Projects/Hackathon/incident-autopsy/.env.local 2>/dev/null)
[ "$KEY" -ge 1 ] && check "OpenAI API key" "ok" \
                  || check "OpenAI API key" "fail" "missing or blank in .env.local"

# 6. Webhook endpoint live
WH=$(curl -s --max-time 3 "$BASE/api/teams/webhook" 2>/dev/null)
echo "$WH" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null \
  && check "Webhook endpoint" "ok" \
  || check "Webhook endpoint" "fail" "not responding"

echo ""
echo "──────────────────────────────────────"
echo "  $ok passed · $fail failed"
echo "──────────────────────────────────────"

# Auto-seed if Teams store is empty
if [ -n "$TMSG" ] && [ "$TMSG" -eq 0 ] 2>/dev/null; then
  echo ""
  echo "  Auto-seeding Teams messages..."
  curl -s -X POST "$BASE/api/teams/webhook" \
    -H "Content-Type: application/json" \
    -d '{"channel":"chip1-releases","role":"Jenkins","text":"✅ release/2026.05.20 deployed to prod — fn-connect 2026.05.20.2 · fn-identity 2026.05.20.0 · chip1-transaction 2026.05.20.1 · DB scripts for Connect + Platform applied","isAlert":false}' > /dev/null
  curl -s -X POST "$BASE/api/teams/webhook" \
    -H "Content-Type: application/json" \
    -d '{"channel":"Chip1-Integration","role":"Engineer","text":"Getting STOCK_CODE_010 errors from fn-connect — Invalid PO id - 0 or PO line id - 0 on XCRM-prod calls. Started after the release/2026.05.20 deployment. Looks like entity ID mapping is returning wrong contact records for some accounts","isAlert":true}' > /dev/null
  curl -s -X POST "$BASE/api/teams/webhook" \
    -H "Content-Type: application/json" \
    -d '{"channel":"Chip1-Integration","role":"On-call","text":"Confirmed — duplicate contact entries in entity_id_mapping causing findUnifiedEntityMappingInfoByParent to resolve wrong XCRM IDs. PR #355 fix being deployed as release/2026.05.21","isAlert":false}' > /dev/null
  echo "  $PASS Seeded 3 messages — re-run check to verify"
fi

echo ""
