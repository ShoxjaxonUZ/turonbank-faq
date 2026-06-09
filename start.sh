#!/usr/bin/env bash
# ─────────────────────────────────────────────
#  TuronBank FAQ — ishga tushirish skripti
#  Ollama + Vite dev server (frontend + backend)
# ─────────────────────────────────────────────

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
OLLAMA_PORT=11434

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ████████╗██╗   ██╗██████╗  ██████╗ ███╗   ██╗"
echo "     ██╔══╝██║   ██║██╔══██╗██╔═══██╗████╗  ██║"
echo "     ██║   ██║   ██║██████╔╝██║   ██║██╔██╗ ██║"
echo "     ██║   ██║   ██║██╔══██╗██║   ██║██║╚██╗██║"
echo "     ██║   ╚██████╔╝██║  ██║╚██████╔╝██║ ╚████║"
echo "     ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝"
echo -e "${NC}"
echo -e "${CYAN}  TuronBank FAQ — ishga tushirish${NC}"
echo "  ──────────────────────────────────────────────"

# ── 1. Ollama tekshirish / ishga tushirish ──────────
echo -e "\n${YELLOW}[1/3] Ollama tekshirilmoqda...${NC}"

if curl -s "http://localhost:${OLLAMA_PORT}/api/tags" > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Ollama allaqachon ishlamoqda (port ${OLLAMA_PORT})${NC}"
else
  echo -e "${YELLOW}  ⚙  Ollama ishga tushirilmoqda...${NC}"
  if command -v ollama > /dev/null 2>&1; then
    ollama serve > /tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    echo "  PID: $OLLAMA_PID"

    # Tayyor bo'lguncha kut (max 15 soniya)
    for i in $(seq 1 15); do
      sleep 1
      if curl -s "http://localhost:${OLLAMA_PORT}/api/tags" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Ollama tayyor (${i}s)${NC}"
        break
      fi
      if [ "$i" -eq 15 ]; then
        echo -e "${RED}  ✗ Ollama 15 soniyada ishga tushmadi. Log: /tmp/ollama.log${NC}"
        echo -e "${YELLOW}  → Davom etilmoqda (AI funksiyalar ishlamasligi mumkin)${NC}"
      fi
    done
  else
    echo -e "${RED}  ✗ ollama topilmadi. https://ollama.com dan o'rnating.${NC}"
    echo -e "${YELLOW}  → Davom etilmoqda (AI funksiyalar ishlamasligi mumkin)${NC}"
  fi
fi

# ── 2. Modellar ro'yxati ────────────────────────────
echo -e "\n${YELLOW}[2/3] Mavjud modellar:${NC}"
MODELS=$(curl -s "http://localhost:${OLLAMA_PORT}/api/tags" 2>/dev/null \
  | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  for m in d.get('models', []):
    size = m.get('size', 0) / 1e9
    print(f\"  • {m['name']}  ({size:.1f} GB)\")
except:
  print('  (modellar olinmadi)')
" 2>/dev/null || echo "  (python3 topilmadi)")
echo -e "${GREEN}${MODELS}${NC}"

# ── 3. Vite dev server ──────────────────────────────
echo -e "\n${YELLOW}[3/3] Vite dev server ishga tushirilmoqda...${NC}"
echo -e "${GREEN}  ✓ Frontend + API birgalikda ishlamoqda${NC}"
echo ""
echo -e "  ${CYAN}http://localhost:5173${NC}  ← asosiy manzil"
echo -e "  ${CYAN}http://localhost:5174${NC}  ← agar 5173 band bo'lsa"
echo ""
echo -e "  ${YELLOW}To'xtatish uchun: Ctrl+C${NC}"
echo "  ──────────────────────────────────────────────"
echo ""

cd "$ROOT"
npm run dev
