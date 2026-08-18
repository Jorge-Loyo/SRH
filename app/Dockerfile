# ── Etapa 1: build del frontend ──────────────────────────────────────────────
FROM node:18-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Etapa 2: imagen final del backend ────────────────────────────────────────
FROM node:18-alpine
WORKDIR /usr/src/app

COPY app/package*.json ./
RUN npm ci --only=production

RUN mkdir -p logs

COPY app/ .

# Copiamos el SPA compilado al lugar donde Express lo sirve
COPY --from=frontend-build /frontend/dist ./public/spa

EXPOSE 3000

CMD sh -c "npm run migrate && npm start"
