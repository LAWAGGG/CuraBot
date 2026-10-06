FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
COPY src ./src
RUN uv pip install --system --no-cache .

COPY alembic.ini ./
COPY alembic ./alembic
RUN mkdir -p uploads

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
