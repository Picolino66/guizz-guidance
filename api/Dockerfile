FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache \
  ca-certificates

COPY package*.json ./
RUN npm install

COPY tsconfig*.json ./
COPY prisma ./prisma
RUN npm run prisma:generate

COPY src ./src
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:migrate && npm run db:seed && npm run start"]
