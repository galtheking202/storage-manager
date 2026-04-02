FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN ./node_modules/.bin/prisma generate
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma db push --accept-data-loss && ./node_modules/.bin/ts-node --transpile-only src/index.ts"]
