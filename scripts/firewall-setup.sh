#!/usr/bin/env bash
# ============================================================
# SmartTech IoT OS — Configuração UFW / Firewall de Rede
# Item 3 — OWASP: Defense in Depth / NIST CSF 2.0 PR.AC-5
# Execute como root: sudo bash scripts/firewall-setup.sh
# ============================================================
set -euo pipefail

echo "=== SmartTech IoT OS — UFW Firewall Setup ==="

# Garante que UFW está instalado
if ! command -v ufw &>/dev/null; then
  apt-get update -qq && apt-get install -y ufw
fi

# ── 1. Políticas padrão ────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing

# ── 2. SSH (porta 22 — limitar tentativas de brute force) ──
# Permitir SSH apenas de IPs internos/VPN (ajuste conforme necessidade)
ufw limit ssh comment "SSH: rate-limited"

# ── 3. HTTP / HTTPS ────────────────────────────────────────
ufw allow 80/tcp  comment "HTTP redirect to HTTPS"
ufw allow 443/tcp comment "HTTPS"

# ── 4. Node / API backend (acesso apenas local / Nginx) ────
# Porta 3001 só pode ser acessada por localhost (Nginx faz o proxy)
ufw deny 3001/tcp comment "Node API - acesso externo bloqueado"

# ── 5. Firestore / Firebase via HTTPS — já usa 443 ─────────
# Nenhuma porta extra necessária; tráfego sai pela 443

# ── 6. Bloquear portas comuns exploradas ──────────────────
ufw deny 23/tcp    comment "Telnet"
ufw deny 3389/tcp  comment "RDP"
ufw deny 5900/tcp  comment "VNC"
ufw deny 27017/tcp comment "MongoDB"
ufw deny 5432/tcp  comment "PostgreSQL (externo)"
ufw deny 6379/tcp  comment "Redis"

# ── 7. Rate limit extra via iptables para HTTP/HTTPS ──────
# Max 30 novas conexões por minuto por IP
iptables -I INPUT -p tcp --dport 443 -m state --state NEW \
  -m limit --limit 30/min --limit-burst 50 -j ACCEPT
iptables -I INPUT -p tcp --dport 443 -m state --state NEW -j DROP

# ── 8. Habilitar UFW ──────────────────────────────────────
ufw --force enable

echo ""
echo "=== Status do Firewall ==="
ufw status verbose

echo ""
echo "=== Regras iptables HTTPS ==="
iptables -L INPUT -n --line-numbers | grep "443\|DROP"

echo ""
echo "[OK] Firewall configurado com sucesso."
echo "     Certifique-se de que sua sessão SSH está ativa antes de fechar este terminal."
