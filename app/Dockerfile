# imagen única — frontend buildeado por CI/Vercel
FROM node:18-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

RUN mkdir -p logs

COPY . .

EXPOSE 3000

CMD sh -c "npm run migrate && npm start"
