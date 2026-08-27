FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY src/ ./src/

RUN mkdir -p /data

ENV DB_PATH=/data/rollfilm.db
ENV PORT=3000

RUN node src/db/migrate.js

EXPOSE 3000

CMD ["node", "src/index.js"]
