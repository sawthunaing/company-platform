#!/usr/bin/env bash
# Tests deploy/backup with real Postgres containers:
#   - backup.sh writes a database dump and an uploads archive
#   - backups older than 7 days are deleted, newer ones are kept
#   - restore.sh restores the dump into a FRESH Postgres server with the same data
#   - restore.sh refuses to restore over an existing database
#
#   deploy/test/backup-restore.sh      needs Docker
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: don't rewrite /paths in docker arguments

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
if command -v cygpath > /dev/null; then ROOT=$(cygpath -m "$ROOT"); fi
ID=bkp-test-$$
NET=$ID-net
IMAGE=$ID-image
FAILED=0

pass() { echo "  ok    $*"; }
fail() { echo "  FAIL  $*"; FAILED=1; }
check() { local name=$1; shift; if "$@"; then pass "$name"; else fail "$name"; fi; }

cleanup() {
  docker rm -f "$ID-live" "$ID-fresh" > /dev/null 2>&1 || true
  docker volume rm "$ID-backups" "$ID-uploads" > /dev/null 2>&1 || true
  docker network rm "$NET" > /dev/null 2>&1 || true
  docker rmi "$IMAGE" > /dev/null 2>&1 || true
}
trap cleanup EXIT

PG=(-e POSTGRES_USER=app -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=company)
# Runs a command in the backup image, connected to the given Postgres server.
in_backup() {
  local host=$1; shift
  docker run --rm --network "$NET" -e PGHOST="$host" -e PGUSER=app -e PGPASSWORD=secret -e PGDATABASE=company \
    -v "$ID-backups:/backups" -v "$ID-uploads:/uploads" "$IMAGE" "$@"
}
sql() { docker exec "$1" psql -U app -d "${3:-company}" -tAc "$2"; }
# Over TCP: during first start the image runs a temporary socket-only server, so a
# socket check can pass before the real server is up.
wait_pg() { for _ in $(seq 60); do docker exec "$1" pg_isready -h 127.0.0.1 -U app -d company -q && return 0; sleep 1; done; return 1; }

echo "== setup"
docker build -q -t "$IMAGE" "$ROOT/deploy/backup" > /dev/null
docker network create "$NET" > /dev/null
docker volume create "$ID-backups" > /dev/null
docker volume create "$ID-uploads" > /dev/null
docker run -d --name "$ID-live" --network "$NET" "${PG[@]}" postgres:17-alpine > /dev/null
wait_pg "$ID-live"
# Same shape as the API's data: a JSON document and staff rows.
sql "$ID-live" "
  CREATE TABLE home_content (id int PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE staff (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL);
  INSERT INTO home_content (id, data) VALUES (1, '{\"heroTitle\": \"Backup test\", \"sections\": [{\"title\": \"About\", \"body\": \"x\"}]}');
  INSERT INTO staff (email) SELECT 'user' || g || '@company.com' FROM generate_series(1, 250) g;" > /dev/null
docker run --rm -v "$ID-uploads:/uploads" "$IMAGE" sh -c 'echo image-bytes > /uploads/hero.png'

echo "== backup"
in_backup "$ID-live" backup.sh daily > /dev/null
files=$(in_backup "$ID-live" ls /backups)
check "database dump written" grep -q '^db-.*-daily\.dump$' <<< "$files"
check "uploads archive written" grep -q '^uploads-.*-daily\.tar\.gz$' <<< "$files"
check "uploads archive contains the image" grep -q 'hero.png' <<< "$(in_backup "$ID-live" sh -c 'tar -tzf /backups/uploads-*-daily.tar.gz')"

echo "== 7-day retention"
# shellcheck disable=SC2016 # expanded by the shell inside the container
in_backup "$ID-live" sh -c '
  stamp() { date -u -d "@$(( $(date +%s) - $1 ))" "+%Y-%m-%d %H:%M:%S"; }
  touch -d "$(stamp $((8 * 86400)))" /backups/db-old8d-daily.dump /backups/uploads-old8d-daily.tar.gz
  touch -d "$(stamp $((7 * 86400 + 60)))" /backups/db-old7d1m-daily.dump
  touch -d "$(stamp $((6 * 86400)))" /backups/db-old6d-daily.dump
  touch -d "$(stamp $((8 * 86400)))" /backups/unrelated.txt'
in_backup "$ID-live" backup.sh daily > /dev/null
files=$(in_backup "$ID-live" ls /backups)
check "8-day-old backups deleted" test -z "$(grep old8d <<< "$files")"
check "7 days + 1 minute old backup deleted" test -z "$(grep old7d1m <<< "$files")"
check "6-day-old backup kept" grep -q 'db-old6d-daily.dump' <<< "$files"
check "other files left alone" grep -q 'unrelated.txt' <<< "$files"
check "two real dumps present" test "$(grep -c '^db-2.*-daily\.dump$' <<< "$files")" = 2

echo "== restore to a fresh database server"
dump=$(grep '^db-2.*-daily\.dump$' <<< "$files" | tail -1)
docker run -d --name "$ID-fresh" --network "$NET" "${PG[@]}" postgres:17-alpine > /dev/null
wait_pg "$ID-fresh"
in_backup "$ID-fresh" restore.sh "/backups/$dump" company_restored
fingerprint() {
  sql "$1" "SELECT md5(string_agg(t, '|' ORDER BY t)) FROM (
    SELECT data::text || updated_at::text AS t FROM home_content UNION ALL SELECT id::text || email FROM staff) s" "${2:-company}"
}
check "restored data identical to the live database" test "$(fingerprint "$ID-live")" = "$(fingerprint "$ID-fresh" company_restored)"
check "restored staff rows: 250" test "$(sql "$ID-fresh" 'SELECT count(*) FROM staff' company_restored)" = 250
if in_backup "$ID-fresh" restore.sh "/backups/$dump" company_restored > /dev/null 2>&1; then
  fail "restore over an existing database should be refused"
else
  pass "restore over an existing database is refused"
fi

echo
if ((FAILED)); then echo "BACKUP TEST FAILED"; exit 1; fi
echo "backup test passed"
