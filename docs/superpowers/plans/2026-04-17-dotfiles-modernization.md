# Dotfiles Modernization & Robustness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical installer/loading bugs and modernize the toolset (ripgrep, autosuggestions).

**Architecture:** Robust base PATH loading and explicit plugin management to ensure reliability across ARM/Intel Macs.

**Tech Stack:** Zsh, Homebrew, Shell scripting.

---

### Task 1: Installer & Base PATH Robustness

**Files:**
- Modify: `homebrew/install.sh`
- Rename: `system/_path.zsh` → `system/path.zsh`
- Modify: `zsh/zshrc.symlink`

- [ ] **Step 1: Modernize Homebrew installer**

```bash
cat << 'EOF' > homebrew/install.sh
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
EOF
chmod +x homebrew/install.sh
```

- [ ] **Step 2: Rename base path file**

```bash
mv system/_path.zsh system/path.zsh
```

- [ ] **Step 3: Fix load order in zshrc.symlink**
Modify `zsh/zshrc.symlink` to explicitly load `system/path.zsh` first.

```zsh
# Change this block:
unset PATH
# load the path files
for pathfile in ${(M)config_files:#*/path.zsh}
do
  source $pathfile
done

# To this:
unset PATH
# load the base path file first
source $DOTFILES/system/path.zsh

# load the rest of the path files
for pathfile in ${${(M)config_files:#*/path.zsh}:#$DOTFILES/system/path.zsh}
do
  source $pathfile
done
```

- [ ] **Step 4: Commit**

```bash
git add homebrew/install.sh system/path.zsh zsh/zshrc.symlink
git commit -m "fix: modernize installer and ensure base PATH loads first"
```

---

### Task 2: Variable Alignment & GOPATH Safety

**Files:**
- Modify: `golang/path.zsh`
- Modify: `bin/dot`

- [ ] **Step 1: Fix GOPATH**

```zsh
# Modify golang/path.zsh:
export GOPATH=$HOME/go
export GOROOT=$HOMEBREW_PREFIX/opt/go/libexec
export PATH=$GOROOT/bin:$GOPATH/bin:$PATH
```

- [ ] **Step 2: Align dot variables**

```bash
# Modify bin/dot:
# Change:
export ZSH=$HOME/.dotfiles
# To:
export DOTFILES=$HOME/.dotfiles
```

- [ ] **Step 3: Commit**

```bash
git add golang/path.zsh bin/dot
git commit -m "fix: align ZSH/DOTFILES variables and move GOPATH to safe location"
```

---

### Task 3: Brewfile Modernization

**Files:**
- Modify: `Brewfile`

- [ ] **Step 1: Prune and Enhance Brewfile**
Remove `jenv`, `asdf`, `hub`. Add `ripgrep`, `zsh-autosuggestions`, `zsh-syntax-highlighting`, `zsh-completions`.

- [ ] **Step 2: Run brew bundle**
Run: `brew bundle`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add Brewfile
git commit -m "feat: modernize Brewfile with ripgrep and zsh plugins"
```

---

### Task 4: Plugin Sourcing & Aliases

**Files:**
- Modify: `zsh/config.zsh`
- Modify: `zsh/zshrc.symlink`
- Modify: `zsh/aliases.zsh`

- [ ] **Step 1: Explicitly source plugins in config.zsh**

```zsh
# Add to zsh/config.zsh:
# Source plugins from Homebrew
if [ -d "$HOMEBREW_PREFIX/share/zsh-autosuggestions" ]; then
  source $HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh
fi

if [ -d "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting" ]; then
  source $HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi
```

- [ ] **Step 2: Cleanup OMZ plugins**
Remove `zsh-syntax-highlighting` and `zsh-nvm` from `plugins` array in `zsh/zshrc.symlink`.

- [ ] **Step 3: Add productivity aliases**

```zsh
# Add to zsh/aliases.zsh:
alias s='rg'
alias ..='cd ..'
alias ...='cd ../..'
```

- [ ] **Step 4: Verify with reload**
Run: `exec zsh`
Expected: No errors, `s` command works, autosuggestions active.

- [ ] **Step 5: Commit**

```bash
git add zsh/config.zsh zsh/zshrc.symlink zsh/aliases.zsh
git commit -m "feat: explicit plugin sourcing and productivity aliases"
```
