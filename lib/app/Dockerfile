FROM node:18-alpine

RUN apk add --no-cache traceroute

WORKDIR /app

COPY package.json .
RUN npm install
COPY server.js .

EXPOSE 80

CMD ["node", "server.js"]