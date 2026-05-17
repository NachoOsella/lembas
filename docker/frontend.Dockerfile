# syntax=docker/dockerfile:1.7

# Build the Angular frontend with npm dependencies cached in a Docker layer.
FROM node:20-alpine AS build
WORKDIR /workspace/frontend

# Copy package manifests first to maximize Docker layer cache reuse without BuildKit.
COPY frontend/package*.json ./
RUN npm ci

# Copy the frontend source and build the production bundle.
COPY frontend/ ./
RUN npm run build

# Serve the static Angular files through an unprivileged Nginx image.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Build output path: dist/<project-name>/browser, where project-name comes from angular.json.
ARG NG_DIST_PATH=dist/frontend/browser
COPY --chown=101:101 docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /workspace/frontend/${NG_DIST_PATH} /usr/share/nginx/html

EXPOSE 8080
