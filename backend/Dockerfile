# ---------- estagio de build ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ---------- estagio de execucao ----------
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# aqui ficam as devDependencies de proposito, porque o guia de execucao usa
# "docker-compose exec backend npx prisma migrate dev" e "npm run prisma:seed"
COPY package*.json ./
RUN npm install

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 5000

CMD ["node", "dist/server.js"]