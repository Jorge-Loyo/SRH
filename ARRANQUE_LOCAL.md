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

## Notas

- El frontend ya está compilado en `app/public/spa/` y lo sirve el backend directamente.
- Si hacés cambios en el frontend, hay que rebuildearlo:
  ```bash
  cd /c/Desarrollo/SRH/dotacion-rrhh/frontend
  npm run build
  ```
- La rama de trabajo es **Jorge** (no tocar `develop`).
- Para cambiar de rama: `git checkout Jorge`
