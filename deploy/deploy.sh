#!/usr/bin/env bash
# Runs on the server, from /opt/company-platform.
#
#   ./deploy.sh <tag>          back up, pull <tag>, start it, wait for health; roll back on failure
#   ./deploy.sh rollback       go back to the tag deployed before the current one
#   ./deploy.sh status         show the deployed tag and the containers
#   ./deploy.sh compose <...>  any docker compose command on this stack, e.g. logs api
#
# Tags are full Git commit SHAs; GitHub Actions calls `./deploy.sh <sha>` after a merge to main.
set -euo pipefail

DIR=$(cd "$(dirname "$0")" && pwd)
STATE_DIR=${DEPLOY_STATE_DIR:-$DIR}
ENV_FILE=${DEPLOY_ENV_FILE:-$DIR/.env}
COMPOSE_FILES=${DEPLOY_COMPOSE_FILES:-$DIR/compose.prod.yaml}
HEALTH_TIMEOUT=${DEPLOY_HEALTH_TIMEOUT:-180}
SKIP_PULL=${DEPLOY_SKIP_PULL:-}     # local tests use images that are built, not pulled
HEALTHY_SERVICES=(db api website backoffice)

log() { echo "$(date -u +%FT%TZ) deploy: $*"; }

compose() {
  local args=()
  for f in $COMPOSE_FILES; do args+=(-f "$f"); done
  args+=(--env-file "$ENV_FILE")
  [[ -f $STATE_DIR/tag.env ]] && args+=(--env-file "$STATE_DIR/tag.env")
  docker compose "${args[@]}" "$@"
}

current_tag() { sed -n 's/^TAG=//p' "$STATE_DIR/tag.env" 2>/dev/null || true; }

set_tag() { printf 'TAG=%s\n' "$1" > "$STATE_DIR/tag.env"; }

# Waits until every service in HEALTHY_SERVICES reports healthy and caddy is running.
wait_healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT)) svc id status pending
  while ((SECONDS < deadline)); do
    pending=()
    for svc in "${HEALTHY_SERVICES[@]}"; do
      id=$(compose ps -aq "$svc")
      status=$( [[ -n $id ]] && docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo missing)
      # A container that keeps crashing will not recover: fail now, not at the timeout.
      if [[ -n $id ]] && (($(docker inspect -f '{{.RestartCount}}' "$id") >= 3)); then
        log "$svc keeps crashing (restarted 3 times)"
        return 1
      fi
      [[ $status == healthy ]] || pending+=("$svc=$status")
    done
    id=$(compose ps -q caddy)
    [[ -n $id && $(docker inspect -f '{{.State.Running}}' "$id") == true ]] || pending+=("caddy=stopped")
    if ((${#pending[@]} == 0)); then return 0; fi
    sleep 3
  done
  log "not healthy after ${HEALTH_TIMEOUT}s: ${pending[*]}"
  return 1
}

start() {
  local tag=$1
  set_tag "$tag"
  [[ -n $SKIP_PULL ]] || compose pull --quiet
  compose up -d --remove-orphans
  # The Caddyfile may have changed with this deploy; a running Caddy does not notice by itself.
  compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
}

deploy() {
  local new=$1 prev
  prev=$(current_tag)
  log "deploying $new (current: ${prev:-none})"

  # Migrations run when the API starts, so take a backup first. Rolling back the
  # images does not roll back the schema; the runbook covers restoring this backup.
  if [[ -n $prev ]] && [[ -n $(compose ps -q --status running db) ]]; then
    compose run --rm --no-deps backup backup.sh "pre-deploy-${new:0:12}"
  fi

  start "$new"
  if wait_healthy; then
    [[ -n $prev && $prev != "$new" ]] && printf '%s\n' "$prev" > "$STATE_DIR/previous-tag"
    log "deployed $new"
    docker image prune -af --filter "until=336h" > /dev/null || true
    return 0
  fi

  compose ps
  compose logs --tail 50 api website backoffice || true
  if [[ -z $prev || $prev == "$new" ]]; then
    log "FAILED: $new is not healthy and there is no earlier version to roll back to"
    return 1
  fi
  log "FAILED: rolling back to $prev"
  start "$prev"
  if wait_healthy; then
    log "rolled back to $prev"
  else
    log "ROLLBACK FAILED: $prev is not healthy either"
  fi
  return 1
}

case ${1:-} in
  "" | -h | --help)
    sed -n '2,10p' "$0"
    ;;
  status)
    echo "deployed: $(current_tag)"
    echo "previous: $(cat "$STATE_DIR/previous-tag" 2>/dev/null || echo none)"
    compose ps
    ;;
  compose)
    shift
    compose "$@"
    ;;
  rollback)
    prev=$(cat "$STATE_DIR/previous-tag" 2>/dev/null || true)
    [[ -n $prev ]] || { log "no previous tag recorded"; exit 1; }
    deploy "$prev"
    ;;
  *)
    [[ $1 =~ ^[0-9a-zA-Z._-]+$ ]] || { log "bad tag: $1"; exit 2; }
    deploy "$1"
    ;;
esac
