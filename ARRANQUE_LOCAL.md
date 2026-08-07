# Cómo arrancar la aplicación localmente

## Requisitos previos
- MySQL 8.0 instalado en `C:\Program Files\MySQL\MySQL Server 8.0\`
- Node.js 18+

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

Doble click en:
```
app\python-service\start.bat
```

O desde CMD:
```cmd
cd C:\Desarrollo\SRH\dotacion-rrhh\app\python-service
start.bat
```

El servicio queda en **http://localhost:5001**  
Verificá que esté activo: http://localhost:5001/health → `{ "status": "ok" }`

> La página muestra un badge verde/rojo según si el servicio está corriendo.
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
