FROM node:20-alpine AS frontend
WORKDIR /build/web
COPY wind-composer/web/package.json wind-composer/web/package-lock.json* ./
RUN npm install
COPY wind-composer/web/ ./
RUN npm run build

FROM python:3.12-slim AS backend
WORKDIR /app/wind-composer
RUN apt-get update && apt-get install -y --no-install-recommends libportaudio2 \
    && rm -rf /var/lib/apt/lists/*
COPY wind-composer/requirements-pwa.txt ./requirements-pwa.txt
RUN pip install --no-cache-dir -r requirements-pwa.txt
COPY wind-composer/ ./
RUN python scripts/generate_icons.py || true
COPY --from=frontend /build/web/dist ./web/dist
ENV WEB_DIST=/app/wind-composer/web/dist
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
WORKDIR /app/wind-composer
# Render (and similar hosts) inject PORT; default 8000 for local Docker
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
