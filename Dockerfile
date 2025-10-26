FROM node:20-bullseye

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --include=dev

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx ts-node-dev --respawn --transpile-only src/main.ts || tail -f /dev/null"]
