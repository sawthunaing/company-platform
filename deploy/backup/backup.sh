#!/bin/sh
# Back up the database and the uploaded images, then delete backups older than
# BACKUP_KEEP_DAYS. With RCLONE_REMOTE set, also copy them off the server.
#
#   backup.sh [label]     label is part of the file name: daily, pre-deploy-<sha>, manual
#
# Connection: PGHOST, PGUSER, PGPASSWORD, PGDATABASE.
set -eu

LABEL=${1:-manual}
DIR=${BACKUP_DIR:-/backups}
UPLOADS=${UPLOADS_DIR:-/uploads}
KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}
REMOTE_KEEP_DAYS=${BACKUP_REMOTE_KEEP_DAYS:-30}
log() { echo "$(date -u +%FT%TZ) backup: $*"; }

mkdir -p "$DIR"

# Never overwrite: two runs in the same second wait for the next second.
while :; do
  STAMP=$(date -u +%Y%m%dT%H%M%SZ)
  DB_FILE="$DIR/db-$STAMP-$LABEL.dump"
  UPLOADS_FILE="$DIR/uploads-$STAMP-$LABEL.tar.gz"
  [ -e "$DB_FILE" ] || [ -e "$UPLOADS_FILE" ] || break
  sleep 1
done

# Write to .partial first, so a failed run never leaves a file that looks complete.
pg_dump --format=custom --file="$DB_FILE.partial"
pg_restore --list "$DB_FILE.partial" > /dev/null
mv "$DB_FILE.partial" "$DB_FILE"
log "database → $DB_FILE ($(wc -c < "$DB_FILE") bytes)"

if [ -d "$UPLOADS" ]; then
  tar -czf "$UPLOADS_FILE.partial" -C "$UPLOADS" .
  mv "$UPLOADS_FILE.partial" "$UPLOADS_FILE"
  log "uploads → $UPLOADS_FILE ($(wc -c < "$UPLOADS_FILE") bytes)"
fi

# Retention: strictly older than KEEP_DAYS × 24 h. A daily run then keeps 7 dailies.
find "$DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' -o -name '*.partial' \) \
  -mmin +$((KEEP_DAYS * 24 * 60)) -print -delete | while read -r f; do log "deleted $f"; done

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$DIR" "$RCLONE_REMOTE" --include 'db-*.dump' --include 'uploads-*.tar.gz'
  rclone delete "$RCLONE_REMOTE" --min-age "${REMOTE_KEEP_DAYS}d"
  log "copied to $RCLONE_REMOTE (kept there for $REMOTE_KEEP_DAYS days)"
fi
