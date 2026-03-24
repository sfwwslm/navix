FROM node:24-bullseye-slim AS frontend-builder

WORKDIR /workspace
ARG NPM_REGISTRY
ARG APT_MIRROR
ENV CI=true
COPY . .
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate \
  && if [ -n "${NPM_REGISTRY}" ]; then pnpm config set registry "${NPM_REGISTRY}"; fi
RUN pnpm install --frozen-lockfile
RUN pnpm --dir apps/web web:build

FROM rust:1.94-bullseye AS backend-builder

WORKDIR /workspace
ARG CARGO_REGISTRY_MIRROR
ARG APT_MIRROR
ENV CARGO_HTTP_TIMEOUT=120
ENV CARGO_NET_RETRY=10
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse
RUN if [ -n "${APT_MIRROR}" ]; then \
      sed -i "s|http://deb.debian.org/debian|${APT_MIRROR}/debian|g; s|https://deb.debian.org/debian|${APT_MIRROR}/debian|g; s|http://deb.debian.org/debian-security|${APT_MIRROR}/debian-security|g; s|https://deb.debian.org/debian-security|${APT_MIRROR}/debian-security|g; s|http://security.debian.org/debian-security|${APT_MIRROR}/debian-security|g; s|https://security.debian.org/debian-security|${APT_MIRROR}/debian-security|g" /etc/apt/sources.list; \
    fi
RUN apt-get update && apt-get install -y --no-install-recommends \
  pkg-config \
  libssl-dev \
  libsqlite3-dev \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN if [ -n "${CARGO_REGISTRY_MIRROR}" ]; then \
      mkdir -p /usr/local/cargo && \
      printf '[source.crates-io]\nreplace-with = "mirror"\n\n[source.mirror]\nregistry = "%s"\n\n[net]\ngit-fetch-with-cli = true\n' "${CARGO_REGISTRY_MIRROR}" > /usr/local/cargo/config.toml; \
    fi

COPY . .
COPY --from=frontend-builder /workspace/apps/web/dist ./apps/web/dist

WORKDIR /workspace/apps/server
ENV DATABASE_URL=sqlite:database/navix-server.db
RUN cargo build --release --locked -p navix-server

FROM debian:bullseye-slim

ARG APT_MIRROR
RUN if [ -n "${APT_MIRROR}" ]; then \
      sed -i "s|http://deb.debian.org/debian|${APT_MIRROR}/debian|g; s|https://deb.debian.org/debian|${APT_MIRROR}/debian|g; s|http://deb.debian.org/debian-security|${APT_MIRROR}/debian-security|g; s|https://deb.debian.org/debian-security|${APT_MIRROR}/debian-security|g; s|http://security.debian.org/debian-security|${APT_MIRROR}/debian-security|g; s|https://security.debian.org/debian-security|${APT_MIRROR}/debian-security|g" /etc/apt/sources.list; \
    fi
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=backend-builder /workspace/target/release/navix-server /usr/local/bin/navix-server

WORKDIR /data
RUN mkdir -p /data/database /data/storage

ENV HTTP_PORT=9990
ENV HTTPS_PORT=9991
ENV DATABASE_URL=sqlite:database/navix-server.db
ENV HOME=/data

EXPOSE 9990 9991
ENTRYPOINT ["/usr/local/bin/navix-server"]
