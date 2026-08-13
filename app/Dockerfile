FROM node:18-alpine

# Directorio en el contenedor
WORKDIR /usr/src/app

COPY package*.json ./

# Instalamos dependencias
RUN npm ci --only=production

# Creamos la carpeta de logs que pide la app
RUN mkdir -p logs

# Copiamos el resto del código
COPY . .

# Exponemos el puerto
EXPOSE 3000

# El comando de arranque: Migra la BD y luego levanta la app
CMD sh -c "npm run migrate && npm start"
