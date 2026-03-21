#!/bin/bash
# ============================================================================
# Azure Web App startup script for Loan Fraud Detection API
# ============================================================================
PORT=${PORT:-8000}
APP_DIR="$(pwd)"

# Activate the virtual environment (antenv is co-located in the extracted temp dir)
if [ -f "${APP_DIR}/antenv/bin/activate" ]; then
    source "${APP_DIR}/antenv/bin/activate"
fi

# Prepend the app root to PYTHONPATH so 'app/' package is always importable.
# Azure Oryx sets PYTHONPATH to only antenv/site-packages — we must add the
# source root explicitly here so all gunicorn workers can find the app/ package.
export PYTHONPATH="${APP_DIR}:${PYTHONPATH:-}"

echo "Starting on port $PORT from ${APP_DIR}"
echo "PYTHONPATH=${PYTHONPATH}"

exec gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:${PORT}" \
    --timeout 600 \
    --log-level info \
    --access-logfile "-" \
    --error-logfile "-"
