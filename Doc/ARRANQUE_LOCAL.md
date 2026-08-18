# Arranque local — Sistema de Gestión de Dotación GCABA

---

## Requisitos previos

| Requisito | Versión | Uso |
|---|---|---|
| MySQL | 8.0 | Base de datos principal |
| Node.js | 18+ | Backend y frontend |
| Python | 3.10+ | Microservicio Dotaneitor (opcional) |

---

## 1. Verificar que MySQL esté corriendo

Desde **Servicios de Windows** (Win + R → `services.msc`) verificar que `MySQL80` esté iniciado.

O desde CMD:
```cmd
net start MySQL80
```

### Datos de conexión

| Campo    | Valor         |
|----------|---------------|
| Host     | localhost     |
| Puerto   | 3306          |
| Usuario  | dotacion_user |
| Password | Matris94.     |
| Base     | dotacion_db   |

---

## 2. Levantar el backend (Node.js)

Desde **Git Bash**:
```bash
cd /c/Desarrollo/SRH/dotacion-rrhh/app
npm run dev
```

El backend queda corriendo en **http://localhost:3000**

> El frontend ya está compilado en `app/public/spa/` y lo sirve el backend directamente.

---

## 3. Acceder a la aplicación

```
http://localhost:3000
```

| Campo    | Valor |
|----------|-------|
| Usuario  | admin |
| Password | admin |

---

## 4. Levantar el microservicio Dotaneitor (opcional)

Solo necesario para usar la herramienta **Dotaneitor** en `/herramientas/dotaneitor`.

### Primera vez — instalar dependencias Python

Desde **Git Bash** (rutas Unix):
```bash
cd /c/Desarrollo/SRH/dotacion-rrhh/app/python-service
python -m pip install -r requirements.txt
```

Desde **CMD** (rutas Windows):
```cmd
cd C:\Desarrollo\SRH\dotacion-rrhh\app\python-service
python -m pip install -r requirements.txt
```

Dependencias principales: `fastapi`, `uvicorn`, `pandas`, `openpyxl`, `mysql-connector-python`, `python-dotenv`.

### Levantar el servicio

**Opción A** — doble click en el archivo:
```
C:\Desarrollo\SRH\dotacion-rrhh\app\python-service\start.bat
```

**Opción B** — desde Git Bash:
```bash
cd /c/Desarrollo/SRH/dotacion-rrhh/app/python-service
python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

**Opción C** — desde CMD:
```cmd
cd C:\Desarrollo\SRH\dotacion-rrhh\app\python-service
python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

> ⚠️ En Git Bash usar siempre `/c/Desarrollo/...` — las rutas `C:\...` no funcionan en Bash.

> El `start.bat` instala las dependencias automáticamente antes de levantar.

### Verificar que está activo
```
http://localhost:5001/health
```
Respuesta esperada: `{ "status": "ok", "service": "dotaneitor" }`

> La página `/herramientas/dotaneitor` muestra un badge verde/rojo según si el servicio está corriendo.

---

## 5. Rebuilding del frontend

Si se hacen cambios en el frontend, hay que recompilar:

```bash
cd /c/Desarrollo/SRH/dotacion-rrhh/frontend
npm run build
```

El build genera los archivos en `app/public/spa/` que el backend sirve directamente.

---

## 6. URLs disponibles

| Servicio | URL |
|---|---|
| Aplicación | http://localhost:3000 |
| Swagger UI (backend) | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs.json |
| Dotaneitor (Python) | http://localhost:5001 |
| Dotaneitor health | http://localhost:5001/health |
| Dotaneitor Swagger | http://localhost:5001/docs |
| Dotaneitor ReDoc | http://localhost:5001/redoc |

> El Swagger del backend Node solo aparece en entorno `development` (`npm run dev`). En producción no existe.

---

## 7. Git — rama de trabajo

La rama activa es **Desarrollo_Jorge**. No tocar `develop`.

```bash
git checkout Desarrollo_Jorge
git status
```

Para hacer commit:
```bash
cd /c/Desarrollo/SRH/dotacion-rrhh
git add -A
git commit -m "descripción del cambio"
```
