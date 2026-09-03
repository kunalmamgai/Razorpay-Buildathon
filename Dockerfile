# ═══════════════════════════════════════════════════════════════════════
# RazorCage AI — Production Backend Dockerfile
# ═══════════════════════════════════════════════════════════════════════
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2 and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies
COPY requirements.txt .

# Install dependencies including psycopg2-binary for PostgreSQL pooling
RUN pip install --no-cache-dir -r requirements.txt psycopg2-binary

# Copy application code
COPY backend ./backend

# Environment defaults
ENV PYTHONPATH=/app \
    PORT=8000 \
    APP_ENV=production

EXPOSE 8000

# Run FastAPI backend using Uvicorn with multi-worker pool
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT} --workers 4"]
