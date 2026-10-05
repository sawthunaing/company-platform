#!/usr/bin/env bash
# Runs the production stack (compose.prod.yaml + Caddyfile + deploy.sh) on this
# machine with DOMAIN=localhost and Caddy's local CA, then checks it over HTTPS:
#   - www, admin and api answer over HTTPS with a certificate from the CA
#   - the apex redirects to www, HTTP redirects to HTTPS
#   - the website shows content from the API, CORS allows only the two frontends
#   - a deploy whose API never gets healthy is rolled back to the previous tag
#
#   deploy/test/smoke.sh          needs Docker and free ports 80 and 443
#   KEEP=1 deploy/test/smoke.sh   leave the stack running afterwards
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: don't rewrite /paths in docker arguments

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
WORK=$(mktemp -d)
# Docker and docker compose on Windows need C:/... paths, which Git Bash also understands.
NULL=/dev/null
if command -v cygpath > /dev/null; then ROOT=$(cygpath -m "$ROOT"); WORK=$(cygpath -m "$WORK"); NULL=NUL; fi
export COMPOSE_PROJECT_NAME=cp-smoke
export DEPLOY_STATE_DIR=$WORK
export DEPLOY_ENV_FILE=$WORK/.env
export DEPLOY_COMPOSE_FILES="$ROOT/deploy/compose.prod.yaml $ROOT/deploy/test/compose.smoke.yaml"
export DEPLOY_SKIP_PULL=1
export DEPLOY_HEALTH_TIMEOUT=120
export SMOKE_CA_FILE=$WORK/root.crt
REGISTRY=cp-smoke
DEPLOY="$ROOT/deploy/deploy.sh"
FAILED=0

pass() { echo "  ok    $*"; }
fail() { echo "  FAIL  $*"; FAILED=1; }
check() { local name=$1; shift; if "$@"; then pass "$name"; else fail "$name"; fi; }
# Like check, but retries for up to $1 seconds.
eventually() {
  local secs=$1 name=$2; shift 2
  local end=$((SECONDS + secs))
  until "$@"; do
    ((SECONDS < end)) || { fail "$name"; return 0; }
    sleep 5
  done
  pass "$name"
}

cleanup() {
  if [[ -z ${KEEP:-} ]]; then
    "$DEPLOY" compose down -v --remove-orphans > /dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

cat > "$WORK/.env" << EOF
DOMAIN=localhost
ACME_EMAIL=smoke@example.com
CADDY_LOCAL_CERTS=local_certs
REGISTRY=$REGISTRY
POSTGRES_USER=app
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=company
JWT_SECRET=$(openssl rand -hex 32)
BACKUP_HOST_DIR=$WORK/backups
EOF

echo "== build images"
docker build -q -t $REGISTRY/api:good "$ROOT/api" > /dev/null
docker build -q -t $REGISTRY/website:good --build-arg API_URL=https://api.localhost --build-arg SITE_URL=https://www.localhost "$ROOT/website" > /dev/null
docker build -q -t $REGISTRY/backoffice:good --build-arg VITE_API_URL=https://api.localhost "$ROOT/backoffice" > /dev/null
docker build -q -t $REGISTRY/backup:good "$ROOT/deploy/backup" > /dev/null
# "bad": same images, but the API exits at start, so it never becomes healthy.
for svc in website backoffice backup; do docker tag $REGISTRY/$svc:good $REGISTRY/$svc:bad; done
printf 'FROM %s\nCMD ["node", "-e", "process.exit(1)"]\n' "$REGISTRY/api:good" | docker build -q -t $REGISTRY/api:bad - > /dev/null

echo "== first deploy"
# Caddy creates its CA on first start; the website reads it at start, so start Caddy first.
# TAG from the shell, not tag.env: deploy.sh must see this as the first deploy.
TAG=good "$DEPLOY" compose up -d --no-deps caddy > /dev/null 2>&1
for _ in $(seq 60); do TAG=good "$DEPLOY" compose exec -T caddy test -f /data/caddy/pki/authorities/local/root.crt && break; sleep 1; done
TAG=good "$DEPLOY" compose cp caddy:/data/caddy/pki/authorities/local/root.crt "$WORK/root.crt" > /dev/null 2>&1
"$DEPLOY" good

# --ssl-no-revoke: Windows curl (Schannel) cannot check revocation for a local CA; ignored elsewhere.
curl_() { curl -sS --max-time 15 --ssl-no-revoke --cacert "$WORK/root.crt" --resolve "$1:443:127.0.0.1" --resolve "$1:80:127.0.0.1" "${@:2}"; }
status() { curl_ "$1" -o "$NULL" -w '%{http_code}' "${@:2}"; }
# header <host> <path> <name> [curl args...] → the value of response header <name>
header() {
  local host=$1 path=$2 name=$3; shift 3
  curl_ "$host" -o "$NULL" -D - "$@" "https://$host$path" | tr -d '\r' | sed -n "s/^$name: //Ip"
}
page_has() { curl_ "$1" "https://$1$2" | grep -q "$3"; }

echo "== HTTPS"
check "www.localhost → 200 over HTTPS, certificate verified" test "$(status www.localhost https://www.localhost/)" = 200
check "admin.localhost → 200 over HTTPS, certificate verified" test "$(status admin.localhost https://admin.localhost/)" = 200
check "api.localhost → 200 over HTTPS, certificate verified" test "$(status api.localhost https://api.localhost/health)" = 200
check "localhost → redirect to https://www.localhost/" test "$(header localhost / location)" = "https://www.localhost/"
check "http://www.localhost → redirect to HTTPS" test "$(curl_ www.localhost -o "$NULL" -w '%{redirect_url}' http://www.localhost/)" = "https://www.localhost/"
check "HSTS header" test -n "$(header www.localhost / strict-transport-security)"
check "admin: frame-ancestors 'none'" test "$(header admin.localhost / content-security-policy)" = "frame-ancestors 'none'"

echo "== apps"
check "api /health reports the database" page_has api.localhost /health '"database"'
title=$(curl_ api.localhost https://api.localhost/api/home | sed -n 's/.*"heroTitle":"\([^"]*\)".*/\1/p')
# The image was built with the API unreachable, so the first page is the placeholder
# until ISR refreshes it (60 s after the build).
eventually 90 "website shows the hero title from the API ($title)" page_has www.localhost / "<h1>$title</h1>"
check "website sitemap uses https://www.localhost" page_has www.localhost /sitemap.xml '<loc>https://www.localhost/</loc>'
check "backoffice serves the app" page_has admin.localhost / '<div id="root">'
check "backoffice deep link → app (SPA fallback)" page_has admin.localhost /login '<div id="root">'
check "CORS allows https://admin.localhost" test "$(header api.localhost /api/home access-control-allow-origin -H 'Origin: https://admin.localhost')" = "https://admin.localhost"
check "CORS refuses another origin" test -z "$(header api.localhost /api/home access-control-allow-origin -H 'Origin: https://evil.example')"

echo "== backup in the stack"
"$DEPLOY" compose exec -T backup backup.sh smoke > /dev/null
has_file() { compgen -G "$1" > /dev/null; }
check "backup.sh wrote a database dump" has_file "$WORK/backups/db-*-smoke.dump"

echo "== failed deploy rolls back"
if "$DEPLOY" bad > "$WORK/bad.log" 2>&1; then fail "deploy of a broken API should fail"; else pass "deploy of a broken API fails"; fi
check "rolled back: tag is good again" grep -qx 'TAG=good' "$WORK/tag.env"
check "pre-deploy backup was taken" has_file "$WORK/backups/db-*-pre-deploy-bad.dump"
check "api healthy again after rollback" test "$(status api.localhost https://api.localhost/health)" = 200
grep -E 'deploy:' "$WORK/bad.log" | sed 's/^/        /'

echo
if ((FAILED)); then echo "SMOKE TEST FAILED"; exit 1; fi
echo "smoke test passed"
