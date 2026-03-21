# =============================================================================
#  Dockerfile – Loan Fraud Detection Backend (FastAPI + Gunicorn/Uvicorn)
# =============================================================================

FROM python:3.11-slim

# Keeps Python from generating .pyc files and ensures stdout/stderr are flushed
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libffi-dev \
        libxml2-dev \
        libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer-cached unless requirements change)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Azure App Service injects $PORT at runtime; default to 8000 locally
ENV PORT=8000

EXPOSE 8000

# Run via Gunicorn with Uvicorn workers (mirrors startup.sh)
CMD gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:${PORT}" \
    --timeout 600 \
    --log-level info \
    --access-logfile "-" \
    --error-logfile "-"
