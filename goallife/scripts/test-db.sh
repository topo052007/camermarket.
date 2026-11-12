#!/usr/bin/env bash
# Lance un PostgreSQL jetable, applique la migration puis les tests de sécurité et de logique.
# Prérequis : PostgreSQL 15+ installé (initdb, pg_ctl, psql dans le PATH ou /usr/lib/postgresql/*/bin).
set -euo pipefail
cd "$(dirname "$0")/.."

BIN=$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")
DOSSIER=$(mktemp -d)
PORT=${PORT_TEST_DB:-54329}
trap '"$BIN/pg_ctl" -D "$DOSSIER" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DOSSIER"' EXIT

if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DOSSIER"
  EXEC="runuser -u postgres --"
else
  EXEC=""
fi

$EXEC "$BIN/initdb" -D "$DOSSIER" -U postgres -A trust >/dev/null
$EXEC "$BIN/pg_ctl" -D "$DOSSIER" -o "-p $PORT -k $DOSSIER -c listen_addresses=''" -w start >/dev/null

PSQL=(psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -h "$DOSSIER" -p "$PORT" -U postgres -d postgres)

"${PSQL[@]}" -f supabase/tests/00-supabase-simule.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
for f in supabase/tests/[1-9]*.sql; do
  echo "▶ $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "✅ Tests base de données réussis"
