# Dotfiles Overhaul Design

**Date:** 2026-04-13  
**Approach:** Incremental by impact layer (Plan B)  
**Invariant:** Shell works after every commit.

---

## Goals

1. Fix broken/unmanaged things that have crept into `zshrc.symlink`
2. Reorganize existing topics for consistency
3. Add missing topics for active tools (GCP, Python)
4. Modernize the Brewfile

---

## Architecture

Four ordered layers, each independently committable and testable.

```
Layer 1: zshrc cleanup          → fix unmanaged injections, trim plugins
Layer 2: Topic reorganization   → GCP split, path fixes, dead files, docs
Layer 3: New topics             → python/, gcp/ (no claude/ — Homebrew manages it)
Layer 4: Brewfile modernization → restructure, prune stale, add missing
```

---

## Layer 1: zshrc Cleanup

**File:** `zsh/zshrc.symlink`

### 1.1 Remove duplicate Go PATH
Line 84: `export PATH=$PATH:$(go env GOPATH)/bin`  
Already handled by `golang/path.zsh`. Delete.

### 1.2 Move Docker completions into topic system
Lines 80–83 (Docker Desktop injection):
```zsh
fpath=(/Users/alex.bershadsky/.docker/completions $fpath)
autoload -Uz compinit
compinit
```
- Move to `docker/completions.zsh` containing only: `fpath=($HOME/.docker/completions $fpath)`
- Replace hardcoded username with `$HOME`
- Drop `autoload -Uz compinit` and `compinit` entirely — oh-my-zsh calls both already

### 1.3 Trim oh-my-zsh plugin list
**Remove:**
- `nvm` — conflicts with `zsh-nvm`; keep `zsh-nvm` (supports lazy loading)
- `gem`, `mvn`, `sbt`, `sdk` — JVM tooling managed by SDKMAN; these are redundant
- `minikube` — slow completions, minimal value

**Keep:** everything else unchanged.

### 1.4 Enable NVM lazy loading
**File:** `nvm/config.zsh`  
Change `NVM_LAZY_LOAD=false` → `NVM_LAZY_LOAD=true`  
Biggest single startup time win without switching frameworks.

### 1.5 Retain SDKMAN block
SDKMAN must stay at the bottom of `zshrc.symlink` per its own requirement.  
Add a clear comment: `# SDKMAN must remain last — do not move`.

---

## Layer 2: Topic Reorganization

### 2.1 Extract GCP topic
**Create:** `gcp/path.zsh`
```zsh
export PATH="$HOMEBREW_PREFIX/share/google-cloud-sdk/bin:$PATH"
export USE_GKE_GCLOUD_AUTH_PLUGIN=True
```
**Edit:** `k8s/path.zsh` — remove GCP lines, keep only kubectl/k8s config.

### 2.2 Fix hardcoded Homebrew path
**File:** `git/extras.zsh`  
Replace `/opt/homebrew` with `$HOMEBREW_PREFIX` (already exported by `system/_path.zsh`).

### 2.3 Remove dead symlink
**Delete:** `bin/subl` — symlink to Sublime Text 2 which is no longer installed.

### 2.4 Standardize ~/.localrc pattern
**Create:** `localrc.example` at repo root:
```zsh
# Machine-specific config and secrets.
# Copy to ~/.localrc — never commit this file.

# GitHub token for Homebrew API rate limits
# export HOMEBREW_GITHUB_API_TOKEN=

# GCP project and credentials
# export CLOUDSDK_CORE_PROJECT=
# export GOOGLE_APPLICATION_CREDENTIALS=

# Claude API key
# export ANTHROPIC_API_KEY=

# Git identity is in git/gitconfig.local.symlink (see .example file)
```
**Edit:** `homebrew/config.zsh` — remove the fragile `cat ~/.git-homebrew-token` hack.  
Replace with a comment: `# Set HOMEBREW_GITHUB_API_TOKEN in ~/.localrc`.

**Add** `localrc.example` to `.gitignore` exemption (it's an example, not a secret — should be tracked).

### 2.5 Update README.md
- Remove reference to `antigen` (shell uses oh-my-zsh)
- Update GitHub URL from `al-dexter/dotfiles` to current
- Add section documenting `~/.localrc` pattern
- Add section listing active topics

---

## Layer 3: New Topics

### 3.1 `python/` topic
**`python/path.zsh`:**
```zsh
# Use Homebrew-managed Python 3
export PATH="$HOMEBREW_PREFIX/opt/python@3.13/bin:$PATH"
```
**`python/config.zsh`:**
```zsh
export VIRTUAL_ENV_DISABLE_PROMPT=1   # Powerlevel10k handles venv display
export PYTHONDONTWRITEBYTECODE=1       # No .pyc files
```
**Edit:** `zsh/aliases.zsh` — remove brittle `alias python=$(brew --prefix python3)/bin/python3` and `alias pip=...`. PATH now handles this correctly.

### 3.2 `gcp/` topic (path.zsh already created in Layer 2)
**`gcp/config.zsh`:**
```zsh
# Set project and credentials in ~/.localrc:
# export CLOUDSDK_CORE_PROJECT=
# export GOOGLE_APPLICATION_CREDENTIALS=
```

### 3.3 No `claude/` topic
Claude CLI is installed via Homebrew. `brew shellenv` in `system/_path.zsh` already adds it to PATH. No topic needed. The recently deleted `claude/path.zsh` (shown in git status as `AD`) confirms this decision.

---

## Layer 4: Brewfile Modernization

### Structure
Reorganize flat list into labeled sections:
```
# === Core CLI ===
# === Shell ===
# === Languages & Runtimes ===
# === Cloud & Infrastructure ===
# === Databases ===
# === Dev Tools ===
# === Casks ===
# === VS Code Extensions ===
```

### Prune (remove)
| Entry | Reason |
|-------|--------|
| `hub` | Superseded by `gh` (already present) |
| `emacs` | Not referenced anywhere in dotfiles |
| `chezmoi` | Competing dotfiles manager, not in use |
| `python@3.9`, `python@3.10` | Replace with `python@3.13` |
| `shivammathur/php/php@5.6` | Very old PHP version, not referenced |
| `ammonite-repl` | `sbt` already provides Scala REPL |
| `tor`, `torsocks` | Not referenced anywhere in dotfiles |
| `starship` | Not used — shell prompt is Powerlevel10k |

### Keep (novelty tools — explicitly retained)
`lolcat`, `fortune`, `figlet`, `hello`

### Add
| Entry | Reason |
|-------|--------|
| `python@3.13` | Replaces old Python versions |
| `claude` | If Homebrew formula exists; otherwise note in comments |

### Flag (not auto-removed, user decision)
- `asdf` — potentially redundant with `nvm` + `jenv` + `sdkman`. Keep unless consolidation is a future goal.

---

## File Change Summary

| File | Action |
|------|--------|
| `zsh/zshrc.symlink` | Remove Go PATH duplicate, Docker block, trim plugins |
| `nvm/config.zsh` | Enable lazy loading |
| `docker/completions.zsh` | New — Docker completions using `$HOME` |
| `gcp/path.zsh` | New — GCP SDK path |
| `gcp/config.zsh` | New — GCP env var stubs |
| `k8s/path.zsh` | Remove GCP lines |
| `git/extras.zsh` | Replace hardcoded path with `$HOMEBREW_PREFIX` |
| `bin/subl` | Delete |
| `homebrew/config.zsh` | Remove token hack, add comment |
| `localrc.example` | New — secrets/machine config template |
| `python/path.zsh` | New |
| `python/config.zsh` | New |
| `zsh/aliases.zsh` | Remove python/pip alias hacks |
| `README.md` | Update throughout |
| `Brewfile` | Restructure, prune, add |

---

## Success Criteria

- [ ] `exec zsh` completes without errors after each layer
- [ ] `echo $PATH` shows no duplicate Go entries
- [ ] NVM lazy loads (first `node` invocation triggers load, not shell start)
- [ ] No hardcoded usernames or absolute paths outside `system/_path.zsh`
- [ ] `~/.localrc` pattern is documented and `localrc.example` exists in repo
- [ ] Brewfile passes `brew bundle check` after modernization
