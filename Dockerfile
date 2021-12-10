FROM node:16.13.1 AS development
WORKDIR /usr/src/app

COPY package*.json ./

ENV NODE_ENV development
RUN npm install

COPY tsconfig.json tsconfig.build.json ./
COPY . .

RUN npm run build

FROM node:16.13.1 AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY --from=development /usr/src/app/dist ./dist

ENV PORT = 80
ENV HOST = 0.0.0.0

EXPOSE 80
CMD ["node", "dist/main.js"]