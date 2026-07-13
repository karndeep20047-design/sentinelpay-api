FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
