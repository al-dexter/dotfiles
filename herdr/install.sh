#!/usr/bin/env bash
#
# Link the Herdr mods, layout and keys into ~/.config/herdr-app.
# Machine-specific values: HERDR_JIRA_SITE in ~/.localrc; Jira token in the Keychain item herdr-jira.

set -e

SRC="$(cd "$(dirname "$0")" && pwd)"
HERDR="$HOME/.config/herdr-app"
# Outside $HERDR: a folder left under mods/ would load as another mod.
BACKUP="$HOME/.herdr-app-backup-$(date +%Y%m%d%H%M%S)"

link () {
  local src="$1" dst="$2"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then return; fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    local saved="$BACKUP/${dst#"$HERDR"/}"
    mkdir -p "$(dirname "$saved")"
    mv "$dst" "$saved"
    echo "  moved existing $dst to $saved"
  fi
  mkdir -p "$(dirname "$dst")"
  ln -s "$src" "$dst"
  echo "  linked $dst"
}

echo "› Linking Herdr config"
for mod in "$SRC"/mods/*/; do
  name="$(basename "$mod")"
  link "$SRC/mods/$name" "$HERDR/mods/$name"
done
link "$SRC/layouts/main-mrs.json" "$HERDR/layouts/main-mrs.json"
link "$SRC/keys.json" "$HERDR/keys.json"
