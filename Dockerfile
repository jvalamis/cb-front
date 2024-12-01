FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ARG PORT
ARG NODE_ENV
ARG GITHUB_CLIENT_ID
ARG AUTH_CLIENT_ID
ARG AUTH_CLIENT_SECRET
ARG SESSION_SECRET
ARG CALLBACK_URL
ARG ALLOWED_USERS
ARG DROPLET_IP
ARG DROPLET_USER
ARG DROPLET_SSH_KEY

RUN echo "PORT=${PORT}" >> .env \
    && echo "NODE_ENV=${NODE_ENV}" >> .env \
    && echo "GITHUB_CLIENT_ID=${AUTH_CLIENT_ID}" >> .env \
    && echo "GITHUB_CLIENT_SECRET=${AUTH_CLIENT_SECRET}" >> .env \
    && echo "SESSION_SECRET=${SESSION_SECRET}" >> .env \
    && echo "CALLBACK_URL=${CALLBACK_URL}" >> .env \
    && echo "ALLOWED_GITHUB_USERS=${ALLOWED_USERS}" >> .env \
    && echo "DROPLET_IP=${DROPLET_IP}" >> .env \
    && echo "DROPLET_USER=${DROPLET_USER}" >> .env \
    && echo "DROPLET_SSH_KEY=${DROPLET_SSH_KEY}" >> .env

EXPOSE 3000

CMD ["node", "src/index.js"] 