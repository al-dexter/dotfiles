# Dotfiles Modernization & Robustness Design

**Date:** 2026-04-17  
**Goal:** Fix critical installer/loading bugs and modernize the toolset (ripgrep, autosuggestions).  
**Approach:** Robust base PATH and explicit plugin management.

---

## 1. Core Fixes & Robustness

### 1.1 Homebrew Installer Modernization
**File:** `homebrew/install.sh`
- Replace outdated `ruby` installer with the official `bash` installer.
- Add robust detection for existing Homebrew on both ARM (`/opt/homebrew`) and Intel (`/usr/local/bin`) paths to prevent redundant installation attempts.

### 1.2 Base PATH Ordering
**File:** `system/path.zsh` (renamed from `_path.zsh`)
- Rename the file to standardize on the `path.zsh` pattern.
- Ensure it handles the initial Homebrew environment setup correctly.

**File:** `zsh/zshrc.symlink`
- Explicitly load `system/path.zsh` before the main `path.zsh` loop.
- This ensures `$HOMEBREW_PREFIX` and basic system paths are available for specialized topics (like `golang` or `gcp`) that depend on them.

### 1.3 Variable Alignment & Safety
**File:** `golang/path.zsh`
- Change `GOPATH` from `$HOMEBREW_PREFIX/opt/go` to `$HOME/go`.  
  *Rationale:* Storing code/binaries inside a Brew-managed directory is risky; `$HOME/go` is the standard and safe location.

**File:** `bin/dot`
- Align `ZSH` and `DOTFILES` variables with `zshrc.symlink`.
- `ZSH` should refer to the Oh-My-Zsh directory (`$HOME/.oh-my-zsh`), and `DOTFILES` should refer to the repo root (`$HOME/.dotfiles`).

---

## 2. Modernization & Performance

### 2.1 Brewfile Pruning & Enhancement
**File:** `Brewfile`
- **Prune (Remove):**
  - `jenv` & `asdf`: Redundant given the use of `nvm`, `sdkman`, and `python@3.13`.
  - `hub`: Superseded by `gh`.
- **Add:**
  - `ripgrep` (`rg`): High-performance search.
  - `zsh-autosuggestions`: DX improvement.
  - `zsh-syntax-highlighting`: DX improvement.
  - `zsh-completions`: Additional completions for various CLI tools.
- **Keep:** `bash`, `zsh`.

### 2.2 Explicit Plugin Management
**File:** `zsh/config.zsh`
- Source `zsh-autosuggestions` and `zsh-syntax-highlighting` explicitly from their Homebrew installation paths.
- This bypasses the slower OMZ custom plugin loader and ensures they are always found if installed via Brew.

**File:** `zsh/zshrc.symlink`
- Remove `zsh-syntax-highlighting` and `zsh-nvm` from the `plugins` array to prevent redundant or slow loading (NVM lazy loading is already handled in `nvm/config.zsh`).

### 2.3 Productivity Aliases
**File:** `zsh/aliases.zsh`
- Add `alias s='rg'` for quick searching.
- Add `alias ..='cd ..'` and `alias ...='cd ../..'` if not present.

---

## 3. Success Criteria

- [ ] `script/bootstrap` successfully detects or installs Homebrew on a fresh system.
- [ ] `exec zsh` loads without errors, even if `.localrc` is missing.
- [ ] `echo $GOPATH` points to `$HOME/go`.
- [ ] `s` (ripgrep) is functional.
- [ ] Zsh autosuggestions and syntax highlighting are active and fast.
- [ ] `brew bundle check` passes after pruning.
