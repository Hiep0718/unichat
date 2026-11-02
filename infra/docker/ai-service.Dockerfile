# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# UniChat AI Service: FastAPI + CPU-only embeddings (build context = repo root).
# -----------------------------------------------------------------------------
FROM python:3.13.14-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/home/unichat/.cache/huggingface

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r -g 10001 unichat \
    && useradd -r -u 10001 -g unichat -d /home/unichat -m -s /usr/sbin/nologin unichat

WORKDIR /app

# CPU wheel first: the default PyPI torch wheel pulls several GB of CUDA libraries
# that an EC2 instance without a GPU never uses. Versions follow requirements.lock.txt.
COPY ai-service/requirements.txt ai-service/requirements.lock.txt ./
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.13.0 \
    && pip install -r requirements.txt -c requirements.lock.txt

COPY --chown=unichat:unichat ai-service/app /app/app
COPY --chown=unichat:unichat ai-service/pyproject.toml /app/pyproject.toml

RUN mkdir -p /home/unichat/.cache/huggingface /app/.service-keys /app/data/storage \
    && chown -R unichat:unichat /app /home/unichat

USER unichat
EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8001/internal/v1/health || exit 1

# One worker: each worker would load its own embedding model and RabbitMQ consumers.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
