#!/usr/bin/env sh

set -eu

install -d -o root -g www-data -m 0750 /run/oakboard
install -o root -g www-data -m 0640 \
  /run/secrets/oakboard-config.source.php \
  "${OAKBOARD_CONFIG_FILE}"

php /usr/local/bin/oakboard-preflight.php

exec "$@"
