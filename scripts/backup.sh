#!/usr/bin/env bash
# ============================================================
# SmartTech IoT OS — Backup Automático do Firestore
# Item 19 — OWASP: Business Continuity / NIST CSF 2.0 RC.RP-1
#
# Pré-requisitos:
#  1. gcloud CLI autenticado (gcloud auth login)
#  2. FIREBASE_PROJECT_ID definido no ambiente
#  3. BACKUP_BUCKET definido (ex: gs://smarttech-iot-backups)
#  4. Cloud Firestore Export habilitado no projeto Firebase
#
# Crontab sugerido (diário às 2h):
#  0 2 * * * /bin/bash /opt/smarttech/scripts/backup.sh >> /var/log/smarttech-backup.log 2>&1
# ============================================================
set -euo pipefail

# ── Configuração ──────────────────────────────────────────
PROJECT_ID="${FIREBASE_PROJECT_ID:-gen-lang-client-0005825814}"
BACKUP_BUCKET="${BACKUP_BUCKET:-gs://smarttech-iot-backups}"
DATE_TAG=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_PATH="${BACKUP_BUCKET}/firestore/${DATE_TAG}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"  # dias para manter backups

echo "[$(date -Iseconds)] Iniciando backup Firestore → ${BACKUP_PATH}"

# ── 1. Exportar Firestore ─────────────────────────────────
gcloud firestore export "${BACKUP_PATH}" \
  --project="${PROJECT_ID}" \
  --async

echo "[$(date -Iseconds)] Export do Firestore iniciado com sucesso."

# ── 2. Remover backups antigos (retention policy) ─────────
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +"%Y-%m-%d" 2>/dev/null \
  || date -v "-${RETENTION_DAYS}d" +"%Y-%m-%d")  # compatível com macOS

echo "[$(date -Iseconds)] Removendo backups com mais de ${RETENTION_DAYS} dias..."

gsutil ls "${BACKUP_BUCKET}/firestore/" 2>/dev/null | while read -r path; do
  # Extrai a data do nome do diretório (formato YYYY-MM-DD)
  folder_date=$(basename "$path" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}' || true)
  if [[ -n "${folder_date}" && "${folder_date}" < "${CUTOFF_DATE}" ]]; then
    echo "  Removendo backup antigo: ${path}"
    gsutil -m rm -r "${path}" || echo "  [AVISO] Falha ao remover ${path}"
  fi
done

# ── 3. Verificar integridade do bucket ────────────────────
echo "[$(date -Iseconds)] Verificando integridade do bucket..."
gsutil ls "${BACKUP_BUCKET}/firestore/" | tail -5

# ── 4. Log de sucesso ─────────────────────────────────────
echo "[$(date -Iseconds)] Backup concluído com sucesso."
echo "  Projeto:  ${PROJECT_ID}"
echo "  Destino:  ${BACKUP_PATH}"
echo "  Retenção: ${RETENTION_DAYS} dias"
