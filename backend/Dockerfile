# ---------- estagio de build ----------
FROM node:22-alpine AS build

WORKDIR /app

# openssl/libc6-compat sao exigidos pelo engine do Prisma no alpine
RUN apk add --no-cache openssl libc6-compat

# o schema precisa existir antes do npm ci: o postinstall roda `prisma generate`
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- estagio de execucao ----------
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# node_modules vem do build de proposito: o guia usa `docker compose exec
# backend npx prisma migrate dev` e `npm run prisma:seed`, que precisam do cli
# do prisma e do tsx (devDependencies).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 5000

CMD ["node", "dist/server.js"]
