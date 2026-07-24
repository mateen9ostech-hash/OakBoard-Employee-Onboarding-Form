# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run typecheck \
    && npm run build -- --emptyOutDir

FROM php:8.4-apache-bookworm AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libcurl4-openssl-dev libonig-dev \
    && docker-php-ext-install -j"$(nproc)" curl mbstring pdo_mysql \
    && a2enmod headers rewrite \
    && rm -rf /var/lib/apt/lists/*

ENV OAKBOARD_CONFIG_FILE=/run/oakboard/oakboard-config.php

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/oakboard-entrypoint
COPY docker/preflight.php /usr/local/bin/oakboard-preflight.php
COPY --from=frontend /app/dist/ /var/www/html/

RUN chmod 0755 /usr/local/bin/oakboard-entrypoint \
    && chown -R www-data:www-data /var/www/html

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/oakboard-entrypoint"]
CMD ["apache2-foreground"]
