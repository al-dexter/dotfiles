#!/usr/bin/env bash
#
# Wire the Homebrew docker CLI to Podman: link the compose and buildx plugins
# and create the auto-loading buildx builder that docker/config.zsh selects.
# Podman Desktop provides the engine, /var/run/docker.sock and
# /usr/local/bin/docker-compose (Settings → CLI Tools → Compose).

set -e

PLUGINS="$HOME/.docker/cli-plugins"
BUILDER="podman-load"

link () {
  local src="$1" dst="$2"
  if [ ! -e "$src" ]; then echo "  skipped $dst: $src not installed"; return; fi
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then return; fi
  mkdir -p "$(dirname "$dst")"
  ln -sfn "$src" "$dst"
  echo "  linked $dst"
}

echo "› Linking docker CLI plugins"
link /usr/local/bin/docker-compose "$PLUGINS/docker-compose"
link "$(brew --prefix)/opt/docker-buildx/bin/docker-buildx" "$PLUGINS/docker-buildx"

if ! command -v docker >/dev/null 2>&1; then
  echo "  skipped buildx builder: docker CLI not installed"
  exit 0
fi
if docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  exit 0
fi
if ! docker info >/dev/null 2>&1; then
  echo "  skipped buildx builder: Podman machine not running"
  exit 0
fi
echo "› Creating buildx builder $BUILDER"
docker buildx create --name "$BUILDER" --driver docker-container \
  --driver-opt default-load=true \
  --buildkitd-flags '--allow-insecure-entitlement=network.host'
