FROM public.ecr.aws/bitnami/node:18 AS builder
ENV NODE_ENV build
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm run build

FROM public.ecr.aws/bitnami/node:18
ENV NODE_ENV production
RUN install_packages ca-certificates
RUN apt-get update && apt-get upgrade -y && apt-get install -y ghostscript && \
    rm -r /var/lib/apt/lists /var/cache/apt/archives
RUN npm install -g pnpm
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/fonts ./fonts
USER 1000
CMD ["pnpm", "run", "start:prod"]
