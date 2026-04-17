#!/bin/sh
#
# Homebrew
#
# This installs some of the common dependencies needed (or at least desired)
# using Homebrew.

# Check for Homebrew
# Detect Homebrew path based on architecture
if [ "$(uname -m)" = "arm64" ]; then
  BREW_PATH="/opt/homebrew/bin/brew"
else
  BREW_PATH="/usr/local/bin/brew"
fi

if ! command -v brew >/dev/null 2>&1 && [ ! -x "$BREW_PATH" ]; then
  echo "  Installing Homebrew for you."

  # Install the official homebrew for each OS type
  if [ "$(uname)" = "Darwin" ]; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  elif [ "$(expr substr $(uname -s) 1 5)" = "Linux" ]; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
else
  echo "  Homebrew already installed."
fi

exit 0
