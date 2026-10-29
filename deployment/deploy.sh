#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/fatou-shop}"
RELEASE_SHA="${RELEASE_SHA:?RELEASE_SHA is required}"
ARCHIVE="${ARCHIVE:-$APP_DIR/incoming/$RELEASE_SHA.tar.gz}"
RELEASES_DIR="$APP_DIR/releases"
SHARED_DIR="$APP_DIR/shared"
CURRENT_LINK="$APP_DIR/current"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_SHA"
DOMAIN="fatoushop.multibrain.cloud"

if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
    echo "RELEASE_SHA must be a full Git commit SHA." >&2
    exit 1
fi

if [[ ! -f "$ARCHIVE" || ! -f "$SHARED_DIR/backend.env" ]]; then
    echo "The release archive or shared backend/.env is missing." >&2
    exit 1
fi

mkdir -p "$RELEASES_DIR"
exec 9>"$APP_DIR/deploy.lock"
if ! flock -n 9; then
    echo "Another Fatou Shop deployment is already running." >&2
    exit 1
fi

if [[ -e "$RELEASE_DIR" ]]; then
    echo "Release $RELEASE_SHA already exists; refusing to overwrite it." >&2
    exit 1
fi

PREVIOUS_RELEASE=""
if [[ -L "$CURRENT_LINK" ]]; then
    PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
fi

cleanup_failed_release() {
    if [[ -d "$RELEASE_DIR" && "$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)" != "$RELEASE_DIR" ]]; then
        rm -rf -- "$RELEASE_DIR"
    fi
}
trap cleanup_failed_release ERR

mkdir "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
rm -f -- "$ARCHIVE"

mkdir -p \
    "$SHARED_DIR/backend-storage/app/private" \
    "$SHARED_DIR/backend-storage/app/public" \
    "$SHARED_DIR/backend-storage/framework/cache/data" \
    "$SHARED_DIR/backend-storage/framework/sessions" \
    "$SHARED_DIR/backend-storage/framework/testing" \
    "$SHARED_DIR/backend-storage/framework/views" \
    "$SHARED_DIR/backend-storage/logs"

ln -s "$SHARED_DIR/backend.env" "$RELEASE_DIR/backend/.env"
ln -s "$SHARED_DIR/backend-storage" "$RELEASE_DIR/backend/storage"
mkdir -p "$RELEASE_DIR/backend/bootstrap/cache"
chmod -R ug+rwX "$RELEASE_DIR/backend/bootstrap/cache"

cd "$RELEASE_DIR/backend"
php artisan optimize:clear
php artisan migrate --force
if [[ ! -f "$SHARED_DIR/.database-seeded" ]]; then
    php artisan db:seed --force
    touch "$SHARED_DIR/.database-seeded"
fi
php artisan storage:link --force
php artisan optimize

NEXT_LINK="$APP_DIR/current.next"
rm -f -- "$NEXT_LINK"
ln -s "$RELEASE_DIR" "$NEXT_LINK"
mv -Tf "$NEXT_LINK" "$CURRENT_LINK"
trap - ERR

if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    HEALTH_URL="https://$DOMAIN/up"
    CURL_ARGS=(--fail --silent --show-error --retry 5 --retry-delay 2 --retry-connrefused "$HEALTH_URL")
else
    HEALTH_URL="http://127.0.0.1/up"
    CURL_ARGS=(--fail --silent --show-error --retry 5 --retry-delay 2 --retry-connrefused -H "Host: $DOMAIN" "$HEALTH_URL")
fi

if ! curl "${CURL_ARGS[@]}" >/dev/null; then
    if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
        ln -s "$PREVIOUS_RELEASE" "$NEXT_LINK"
        mv -Tf "$NEXT_LINK" "$CURRENT_LINK"
        echo "Health check failed; restored the previous release." >&2
    else
        rm -f -- "$CURRENT_LINK"
        echo "Health check failed on the first release." >&2
    fi
    rm -rf -- "$RELEASE_DIR"
    exit 1
fi

find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr \
    | tail -n +6 \
    | cut -d' ' -f2- \
    | while IFS= read -r old_release; do
        [[ -n "$old_release" && "$old_release" != "$RELEASE_DIR" ]] && rm -rf -- "$old_release"
    done

echo "Deployed Fatou Shop release $RELEASE_SHA successfully at $HEALTH_URL"
