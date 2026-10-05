#!/bin/sh
# Restore a database backup into a NEW database. It never touches an existing one:
# switching the live database over is a separate, deliberate step (see the runbook).
#
#   restore.sh <db-*.dump> <new-database-name>
#
# Connection: PGHOST, PGUSER, PGPASSWORD (PGDATABASE is not used).
set -eu

FILE=${1:?usage: restore.sh <db-*.dump> <new-database-name>}
TARGET=${2:?usage: restore.sh <db-*.dump> <new-database-name>}

case "$TARGET" in
  *[!a-z0-9_]* | "") echo "restore: database name must be lowercase letters, digits and _" >&2; exit 2 ;;
esac

pg_restore --list "$FILE" > /dev/null
createdb --maintenance-db=postgres "$TARGET"
pg_restore --no-owner --role="$PGUSER" --exit-on-error --dbname="$TARGET" "$FILE"

echo "restore: $FILE → database $TARGET"
# Exact row count per table, so you can compare with the live database.
psql --dbname="$TARGET" --no-psqlrc --quiet --tuples-only --command "
  SELECT format('  %-30s %s rows', table_name,
    (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1])
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name"
