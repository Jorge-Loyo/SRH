# Cómo arrancar la aplicación localmente

## Requisitos previos
- MySQL 8.0 instalado en `C:\Program Files\MySQL\MySQL Server 8.0\`
- Node.js 18+
- Python 3.10+ (solo para el servicio Dotaneitor)

---

## 1. Verificar que MySQL esté corriendo

Abrí **Servicios de Windows** (Win + R → `services.msc`) y verificá que `MySQL80` esté iniciado.
O desde CMD:
```cmd
net start MySQL80
```

---

## 2. Levantar el backend

Abrí una terminal en Git Bash o CMD:
```bash
cd /c/Desarrollo/SRH/dotacion-rrhh/app
npm run dev
```

El backend queda corriendo en **http://localhost:3000**

---

## 3. Acceder a la aplicación

Abrí el navegador en:
```
http://localhost:3000
```

Usuario: `admin`
Contraseña: `admin`

---

## Datos de conexión a la DB local

| Campo    | Valor          |
|----------|----------------|
| Host     | localhost      |
| Puerto   | 3306           |
| Usuario  | dotacion_user  |
| Password | Matris94.      |
| Base     | dotacion_db    |

---

## 4. Levantar el microservicio Dotaneitor (opcional)

Solo necesario para usar la herramienta **Dotaneitor** (`/herramientas/dotaneitor`).

### Requisito previo — instalar dependencias Python (primera vez)
```cmd
cd C:\Desarrollo\SRH\dotacion-rrhh\app\python-service
python -m pip install -r requirements.txt
```

Dependencias principales: `fastapi`, `uvicorn`, `pandas`, `openpyxl`.

### Levantar el servicio

Opción A — doble click en:
```
app\python-service\start.bat
```

Opción B — desde CMD manualmente:
```cmd
cd C:\Desarrollo\SRH\dotacion-rrhh\app\python-service
python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

> El `start.bat` instala las dependencias automáticamente antes de levantar.

### Verificar que está activo
```
http://localhost:5001/health
```
Respuesta esperada: `{ "status": "ok" }`

### Puerto
| Servicio   | URL                        |
|------------|----------------------------|
| Dotaneitor | http://localhost:5001      |

> La página `/herramientas/dotaneitor` muestra un badge verde/rojo según si el servicio está corriendo.
> Si aparece rojo, ejecutá `start.bat` y recargá la página.

---

## Notas

- El frontend ya está compilado en `app/public/spa/` y lo sirve el backend directamente.
- Si hacés cambios en el frontend, hay que rebuildearlo:
  ```bash
  cd /c/Desarrollo/SRH/dotacion-rrhh/frontend
  npm run build
  ```
- La rama de trabajo es **Desarrollo_Jorge** (no tocar `develop`).
- Para cambiar de rama: `git checkout Desarrollo_Jorge`

---

## Documentacion de la API (Swagger)

Disponible solo con el backend corriendo en modo desarrollo (`npm run dev`).

| Interfaz         | URL                              | Descripcion                        |
|------------------|----------------------------------|------------------------------------|
| Swagger UI       | http://localhost:3000/api/docs   | Explorador interactivo de la API   |
| OpenAPI JSON     | http://localhost:3000/api/docs.json | Spec en formato JSON            |
| Dotaneitor Docs  | http://localhost:5001/docs       | Swagger UI del servicio Python     |
| Dotaneitor ReDoc | http://localhost:5001/redoc      | Documentacion alternativa (ReDoc)  |

> El Swagger del backend Node solo aparece en entorno `development`. En produccion estas rutas no existen.
