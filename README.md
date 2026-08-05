# 🚀 Proyecto Dotación RRHH

Bienvenido al repositorio oficial del sistema de tableros de dotación de Recursos Humanos. 

Este repositorio utiliza una arquitectura unificada (Monorepo) donde convive el código fuente de la Aplicación (Frontend + Backend).

---

## 📁 Estructura del Proyecto

Para mantener el orden y evitar conflictos en los despliegues, el repositorio está dividido de la siguiente manera:

```text
dotacion-rrhh/
├── app/                  # 💻 Espacio de Desarrollo
│   ├── public/           # Archivos estáticos
│   ├── src/              # Código fuente (Node/Express + TypeORM)
│   ├── package.json      # Dependencias del proyecto
│   └── Dockerfile        # Receta de construcción del contenedor
├── .gitlab-ci.yml        # ⚙️ Infra (Pipeline de despliegue automático)
├── docker-compose.yml    # ⚙️ Infra (Orquestación de servicios y BD)
├── .gitignore            # Reglas de exclusión de Git
└── README.md             # Esta documentación
```

---

## 🛠️ Flujo de Trabajo y Despliegue (CI/CD)

El proyecto cuenta con Integración y Despliegue Continuo (CI/CD). 

La rama principal de trabajo es **`develop`**. Cada vez que se realiza un `git push` hacia esta rama, el servidor de GitLab detectará los cambios y actualizará automáticamente la aplicación en el servidor (`https://dotacion.buenosaires.gob.ar`).

### Pasos para contribuir (Ejemplo de uso diario):

1. **Actualizar tu repositorio local:**
   Siempre antes de empezar a trabajar, traé los últimos cambios:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Hacer los cambios en el código:**
   Ingresá a la carpeta de la app y trabajá normalmente:
   ```bash
   cd app
   # ... modificar archivos, probar localmente ...
   ```

3. **Subir los cambios:**
   Una vez testeado, subí los cambios para que se desplieguen solos:
   ```bash
   git add .
   git commit -m "feat: agregar nuevo color al dashboard"
   git push origin develop
   ```
   *Nota: Podés ver el progreso del despliegue en la pestaña CI/CD > Pipelines en GitLab.*

---

## 🖥️ Desarrollo Local

Si necesitás levantar el entorno completo (Base de Datos + Aplicación) en tu computadora usando Docker:

1. Cloná el repositorio.
2. Solicitá el archivo `.env` y colocalo en la raíz del proyecto.
3. Ejecutá el siguiente comando en la raíz del proyecto:
   ```bash
   docker compose up -d --build
   ```
4. La aplicación estará disponible en `http://localhost:3000` (o el puerto definido en tu `.env`).