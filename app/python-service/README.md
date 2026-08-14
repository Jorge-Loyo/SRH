# Dotaneitor — Microservicio Python

## Stack
- **FastAPI** + **Uvicorn**
- **Puerto**: `5001`
- **Imagen base**: `python:3.14-slim`

## Comunicación con la app principal (Node/Express)

El microservicio corre como servicio independiente. La app Express lo llama por HTTP interno:

```
http://python-service:5001   ← dentro de Docker Compose (nombre del servicio)
http://localhost:5001         ← en desarrollo local
```

Variable de entorno en el servicio Node:
```
PYTHON_SERVICE_URL=http://python-service:5001
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/session` | Crear sesión de trabajo |
| POST | `/upload-cargos` | Subir archivo Cargos_Salud.xlsx |
| POST | `/normalizar` | Normalizar datos del archivo |
| POST | `/procesar` | Procesar dotación (lee tablas de BD) |
| POST | `/cruzar` | Cruzar especialidades |
| GET | `/preview` | Preview paginado del resultado |
| GET | `/descargar` | Descargar Excel procesado |
| GET | `/reporte-calidad` | Descargar reporte de calidad |
| POST | `/diff` | Ver diferencias vs BD actual |
| POST | `/guardar-bd` | Guardar resultado en BD |
| GET | `/historial` | Historial de procesos |
| GET | `/ultima-actualizacion` | Fecha del último proceso guardado |
| POST | `/session/delete` | Eliminar sesión y archivos temporales |

## Variables de entorno requeridas

```env
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
```

## Build local

```bash
docker build -t dotaneitor-python ./app/python-service
docker run -p 5001:5001 --env-file app/.env.local dotaneitor-python
```
