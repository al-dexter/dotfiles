# Dotfiles Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up, reorganize, and extend the dotfiles repo across four ordered layers so the shell is fast, well-organized, and fully managed within the topic system.

**Architecture:** holman/dotfiles topic system — each topic dir auto-loads `path.zsh` first, then remaining `*.zsh` files; `*.symlink` files get linked to `$HOME` on bootstrap. Changes stay within this convention throughout.

**Tech Stack:** zsh, oh-my-zsh, Powerlevel10k, Homebrew, Brewfile

---

## File Map

| File | Action |
|------|--------|
| `nvm/config.zsh` | Modify — enable lazy loading |
| `docker/completions.zsh` | Create — Docker completions (moved from zshrc) |
| `zsh/zshrc.symlink` | Modify — trim plugins, remove injections, fix SDKMAN comment |
| `gcp/path.zsh` | Create — GCP SDK path |
| `gcp/config.zsh` | Create — GCP env var stubs |
| `k8s/path.zsh` | Modify — remove GCP lines |
| `git/extras.zsh` | Modify — replace hardcoded Homebrew path |
| `bin/subl` | Delete — dead symlink to Sublime Text 2 |
| `homebrew/config.zsh` | Modify — remove fragile token hack |
| `localrc.example` | Create — secrets/machine config template |
| `README.md` | Modify — remove antigen ref, document localrc, list topics |
| `python/path.zsh` | Create — Python 3 path |
| `python/config.zsh` | Create — Python env vars |
| `zsh/aliases.zsh` | Modify — remove brittle python/pip alias hacks |
| `Brewfile` | Modify — restructure, prune stale, add missing |

---

## Task 1: Enable NVM Lazy Loading

**Files:**
- Modify: `nvm/config.zsh`

- [ ] **Step 1: Verify current eager-load behavior**

```bash
time zsh -i -c exit
```

Note the time. After this task it should be measurably faster (NVM eager load is typically 0.5–1.5s overhead).

- [ ] **Step 2: Replace the NVM config**

Replace the entire contents of `nvm/config.zsh` with:

```zsh
export NVM_LAZY_LOAD=true
export NVM_COMPLETION=true
```

- [ ] **Step 3: Verify shell still loads and NVM lazy-loads**

```bash
exec zsh
```

Expected: shell loads. Then verify NVM is NOT loaded at startup:

```bash
type nvm
```

Expected: `nvm not found` (it loads on first use)

Then trigger the load:

```bash
nvm --version
```

Expected: prints a version number (e.g. `0.39.x`)

- [ ] **Step 4: Commit**

```bash
git add nvm/config.zsh
git commit -m "perf: enable NVM lazy loading to speed up shell startup"
```

---

## Task 2: zshrc Cleanup (Layer 1)

**Files:**
- Create: `docker/completions.zsh`
- Modify: `zsh/zshrc.symlink`

Three problems fixed atomically: Docker completions moved to topic, Go PATH duplicate removed, plugins trimmed.

- [ ] **Step 1: Create `docker/completions.zsh`**

Create the file with only the fpath addition (`autoload` and `compinit` are already handled by oh-my-zsh):

```zsh
fpath=($HOME/.docker/completions $fpath)
```

- [ ] **Step 2: Replace `zsh/zshrc.symlink` with the cleaned version**

Replace the entire file contents with:

```zsh
# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# shortcut to this dotfiles path is $DOTFILES
export DOTFILES=$HOME/.dotfiles
export ZSH=$HOME/.oh-my-zsh

ZSH_THEME="powerlevel10k/powerlevel10k"

# Stash your environment variables in ~/.localrc. This means they'll stay out
# of your main dotfiles repository (which may be public, like this one), but
# you'll have access to them in your scripts.
if [[ -a $HOME/.localrc ]]
then
  source $HOME/.localrc
fi

# load oh-my-zsh
plugins=(
    git
    aws
    alias-finder
    brew
    common-aliases
    command-not-found
    colored-man-pages
    colorize
    docker-compose
    kubectl
    git-extras
    github
    gitignore
    history
    node
    npm
    zsh-navigation-tools
    zsh-interactive-cd
    zsh-nvm
    zsh-syntax-highlighting
    zsh-history-substring-search
)

source $ZSH/oh-my-zsh.sh

# all of our zsh files
typeset -U config_files
config_files=($DOTFILES/**/*.zsh)

unset PATH
# load the path files
for pathfile in ${(M)config_files:#*/path.zsh}
do
  source $pathfile
done

# load everything but the path files
for file in ${${config_files:#*/path.zsh}}
do
  source $file
done

unset config_files

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f $HOME/.p10k.zsh ]] || source $HOME/.p10k.zsh

# SDKMAN must remain last — do not move
export SDKMAN_DIR="$HOME/.sdkman"
[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"
```

**What changed vs original:**
- Removed plugins: `minikube`, `gem`, `mvn`, `sbt`, `sdk`
- Removed Docker Desktop injection block (lines 80–83)
- Removed duplicate Go PATH export (line 84)
- Added `# SDKMAN must remain last — do not move` comment

- [ ] **Step 3: Verify shell loads cleanly**

```bash
exec zsh
```

Expected: no errors, prompt appears normally.

- [ ] **Step 4: Verify Go PATH has no duplicates**

```bash
echo $PATH | tr ':' '\n' | grep go
```

Expected: each Go path entry appears exactly once.

- [ ] **Step 5: Verify Docker completions still work**

```bash
docker <TAB>
```

Expected: completion list appears.

- [ ] **Step 6: Commit**

```bash
git add docker/completions.zsh zsh/zshrc.symlink
git commit -m "chore: move Docker completions to topic, trim OMZ plugins, remove duplicate Go PATH"
```

---

## Task 3: Extract GCP Topic (Layer 2)

**Files:**
- Create: `gcp/path.zsh`
- Modify: `k8s/path.zsh`

GCP config currently lives in `k8s/path.zsh` — wrong topic. Extract it.

- [ ] **Step 1: Create `gcp/path.zsh`**

```zsh
export PATH="$HOMEBREW_PREFIX/share/google-cloud-sdk/bin:$PATH"
export USE_GKE_GCLOUD_AUTH_PLUGIN=True
```

- [ ] **Step 2: Replace `k8s/path.zsh`**

Remove the GCP lines, leaving only the kubectl/k8s config:

```zsh
# kubectl completions are loaded by the kubectl OMZ plugin
```

(The k8s topic currently only had the GCP lines — the kubectl path is managed by Homebrew's shellenv and the `kubectl` OMZ plugin.)

- [ ] **Step 3: Verify shell loads and gcloud is on PATH**

```bash
exec zsh
which gcloud
```

Expected: prints the gcloud path (e.g. `/opt/homebrew/share/google-cloud-sdk/bin/gcloud`).

- [ ] **Step 4: Verify GKE auth plugin env var is set**

```bash
echo $USE_GKE_GCLOUD_AUTH_PLUGIN
```

Expected: `True`

- [ ] **Step 5: Commit**

```bash
git add gcp/path.zsh k8s/path.zsh
git commit -m "refactor: extract GCP config into dedicated gcp/ topic"
```

---

## Task 4: Fix Paths and Remove Dead Files (Layer 2)

**Files:**
- Modify: `git/extras.zsh`
- Delete: `bin/subl`

- [ ] **Step 1: Fix `git/extras.zsh`**

Replace the entire file with:

```zsh
source $HOMEBREW_PREFIX/opt/git-extras/share/git-extras/git-extras-completion.zsh
```

- [ ] **Step 2: Verify shell loads and git-extras completions work**

```bash
exec zsh
git feature <TAB>
```

Expected: git-extras completions appear (e.g. `feature`, `delete-branch`, etc.)

- [ ] **Step 3: Verify bin/subl is gone after staging**

```bash
ls $DOTFILES/bin/
```

Expected: `dns-flush  dot  e  search  set-defaults` — no `subl`.

- [ ] **Step 4: Commit**

```bash
git add git/extras.zsh
git rm bin/subl
git commit -m "fix: replace hardcoded Homebrew path in git/extras.zsh, remove dead subl symlink"
```

---

## Task 5: Standardize ~/.localrc Pattern (Layer 2)

**Files:**
- Create: `localrc.example`
- Modify: `homebrew/config.zsh`

- [ ] **Step 1: Create `localrc.example` at repo root**

```zsh
# Machine-specific config and secrets.
# Copy to ~/.localrc — never commit that file.
#
#   cp localrc.example ~/.localrc
#
# Then fill in the values below.

# GitHub token for Homebrew API rate limits (avoids 60 req/hr cap)
# export HOMEBREW_GITHUB_API_TOKEN=

# GCP project and credentials
# export CLOUDSDK_CORE_PROJECT=
# export GOOGLE_APPLICATION_CREDENTIALS=

# Anthropic / Claude API key
# export ANTHROPIC_API_KEY=

# Git identity is managed separately — see git/gitconfig.local.symlink.example
```

- [ ] **Step 2: Replace `homebrew/config.zsh`**

Replace the entire file with:

```zsh
# Set HOMEBREW_GITHUB_API_TOKEN in ~/.localrc to avoid API rate limits.
# See localrc.example for the variable name.
```

- [ ] **Step 3: Verify shell loads without error**

```bash
exec zsh
```

Expected: no errors. If `HOMEBREW_GITHUB_API_TOKEN` was being set by the old `cat` command, you'll need to add it manually to `~/.localrc`.

- [ ] **Step 4: Verify localrc.example is tracked, not gitignored**

```bash
git status localrc.example
```

Expected: shown as a new untracked file (not ignored).

- [ ] **Step 5: Commit**

```bash
git add localrc.example homebrew/config.zsh
git commit -m "docs: add localrc.example, replace homebrew token hack with documented pattern"
```

---

## Task 6: Update README (Layer 2)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with updated content**

````markdown
# dotfiles (based on [holman/dotfiles](https://github.com/holman/dotfiles))

## Topics

Everything's built around topic areas. If you're adding a new area — say, "rust" — add a `rust` directory and put files in there. Files with `.zsh` extension are automatically loaded into your shell. Files with `.symlink` are symlinked into `$HOME` when you run `script/bootstrap`.

## Components

- **bin/**: Anything in `bin/` will get added to your `$PATH` and be available everywhere.
- **Brewfile**: Applications managed by [Homebrew Bundle](https://github.com/Homebrew/homebrew-bundle). Edit before running initial setup.
- **topic/\*.zsh**: Any files ending in `.zsh` get loaded into your environment.
- **topic/path.zsh**: Loaded first — use to set up `$PATH` or similar.
- **topic/install.sh**: Executed when you run `script/install`. Uses `.sh` extension to avoid auto-loading.
- **topic/\*.symlink**: Symlinked into `$HOME` on bootstrap (without the `.symlink` extension).

## Active Topics

| Topic | Purpose |
|-------|---------|
| `coursier` | Coursier (Scala artifact manager) path |
| `docker` | Docker CLI completions |
| `gcp` | Google Cloud SDK path and config |
| `git` | Git config (symlinked) and git-extras completions |
| `golang` | Go path and environment |
| `homebrew` | Homebrew environment setup |
| `java` | Java path via jenv |
| `k8s` | kubectl config |
| `nvm` | Node Version Manager config |
| `python` | Python 3 path and environment |
| `rust` | Rust/Cargo path |
| `scala` | Scala path |
| `spark` | Spark path |
| `system` | Core PATH, editor, locale |
| `vim` | Vim config (symlinked) |
| `zsh` | Shell config, aliases, history, completions |

## Machine-Specific Config

Private config and secrets live in `~/.localrc`. This file is sourced automatically but is never committed to the repository.

```sh
cp localrc.example ~/.localrc
# then edit ~/.localrc with your values
```

See `localrc.example` for the full list of expected variables.

## Install

```sh
git clone https://github.com/al-dexter/dotfiles.git ~/.dotfiles
cd ~/.dotfiles
script/bootstrap
```

This symlinks the appropriate files in `.dotfiles` to your home directory. Everything is configured within `~/.dotfiles`.

`dot` installs dependencies and sets macOS defaults. Run it periodically:

```sh
dot
```

## Thanks

[Zach Holman](https://github.com/holman) for his [dotfiles](https://github.com/holman/dotfiles) approach.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README — remove antigen ref, add topic table and localrc docs"
```

---

## Task 7: Add Python Topic and GCP Config Stub (Layer 3)

**Files:**
- Create: `python/path.zsh`
- Create: `python/config.zsh`
- Create: `gcp/config.zsh`
- Modify: `zsh/aliases.zsh`

- [ ] **Step 1: Create `python/path.zsh`**

```zsh
export PATH="$HOMEBREW_PREFIX/opt/python@3.13/bin:$PATH"
```

- [ ] **Step 2: Create `python/config.zsh`**

```zsh
export VIRTUAL_ENV_DISABLE_PROMPT=1  # Powerlevel10k handles venv indicator
export PYTHONDONTWRITEBYTECODE=1     # No .pyc files
```

- [ ] **Step 3: Create `gcp/config.zsh`**

```zsh
# Set GCP project and credentials in ~/.localrc:
# export CLOUDSDK_CORE_PROJECT=
# export GOOGLE_APPLICATION_CREDENTIALS=
```

- [ ] **Step 4: Replace `zsh/aliases.zsh`**

Remove the brittle `python`/`pip` aliases — PATH now resolves these correctly. Replace the entire file with:

```zsh
alias c="clear"          # Clear terminal display
alias reload="exec zsh"  # Reload the shell
alias gbrg='git branch -vv | grep "origin/.*: gone]" | cut -d" " -f3 | xargs git branch -D'
alias la='lsd -lha'
alias ll='lsd -lh'
alias ls='lsd --color=auto'
```

- [ ] **Step 5: Verify shell loads and python resolves correctly**

```bash
exec zsh
which python3
```

Expected: `/opt/homebrew/opt/python@3.13/bin/python3`

```bash
which pip3
```

Expected: `/opt/homebrew/opt/python@3.13/bin/pip3`

- [ ] **Step 6: Verify no hardcoded paths remain**

```bash
grep -r "/Users/alex" $DOTFILES --include="*.zsh" --include="*.sh"
```

Expected: no matches (all paths use `$HOME`, `$DOTFILES`, or `$HOMEBREW_PREFIX`).

- [ ] **Step 7: Commit**

```bash
git add python/path.zsh python/config.zsh gcp/config.zsh zsh/aliases.zsh
git commit -m "feat: add python/ topic, gcp config stub; remove brittle python/pip aliases"
```

---

## Task 8: Modernize Brewfile (Layer 4)

**Files:**
- Modify: `Brewfile`

- [ ] **Step 1: Replace `Brewfile` with the restructured version**

```ruby
# === Taps ===
tap "aws/tap"
tap "common-fate/granted"
tap "coursier/formulas"
tap "datawire/blackbird"
tap "github/gh"
tap "hashicorp/tap"
tap "homebrew/bundle"
tap "homebrew/services"
tap "kreuzwerker/taps"
tap "virtuslab/scala-cli"
tap "warrensbox/tap"

# === Core CLI ===
brew "ack"
brew "coreutils"
brew "curl"
brew "fd"
brew "fzf"
brew "gawk"
brew "gnu-sed"
brew "jq"
brew "moreutils"
brew "tree"
brew "unzip"
brew "watch"
brew "wget"
brew "xmlstarlet"

# === Shell ===
brew "bash"
brew "zsh"
brew "lsd"
brew "thefuck"
brew "tldr"
brew "glow"

# === Novelty ===
brew "figlet"
brew "fortune"
brew "hello"
brew "lolcat"

# === Languages & Runtimes ===
brew "go"
brew "node"
brew "nvm"
brew "python@3.13"
brew "perl"
brew "php"
brew "composer"

# === Scala / JVM ===
brew "openjdk"
brew "sbt"
brew "gradle"
brew "gradle-completion"
brew "maven"
brew "jenv"
brew "asdf"
brew "coursier/formulas/coursier"
brew "virtuslab/scala-cli/scala-cli"

# === Cloud & Infrastructure ===
brew "awscli"
brew "aws/tap/copilot-cli"
brew "common-fate/granted/granted"
brew "gh"
brew "kubernetes-cli"
brew "kompose"
brew "minikube"
brew "act"
brew "datawire/blackbird/telepresence"
brew "hashicorp/tap/terraform", link: false
brew "kreuzwerker/taps/m1-terraform-provider-helper"
brew "warrensbox/tap/tfswitch"
brew "terraform-docs"
brew "terraform_landscape"
brew "tflint"

# === Databases ===
brew "postgresql@14"
brew "mariadb"
brew "flyway"
brew "parquet-cli"

# === Dev Tools ===
brew "git"
brew "git-extras"
brew "git-open"
brew "gnupg"
brew "neovim"
brew "vim"
brew "pre-commit"
brew "pwgen"
brew "mkcert"
brew "howdoi"
brew "htop"
brew "dockutil"
brew "s3cmd"
brew "datamash"

# === Build Tools ===
brew "autoconf"
brew "automake"
brew "cmake"
brew "gcc"
brew "boost"
brew "physfs"
brew "sdl2"
brew "sdl2_image"
brew "sdl2_ttf"
brew "qemu"
brew "uncrustify"

# === Media ===
brew "ffmpeg"
brew "imagemagick"
brew "graphicsmagick"
brew "ghostscript"
brew "flac"
brew "libsndfile"
brew "vorbis-tools"

# === Networking ===
brew "telnet"
brew "speedtest-cli"

# === Libraries ===
brew "gettext"
brew "openssl@3"
brew "glib"
brew "cairo"
brew "harfbuzz"
brew "pango"
brew "gdk-pixbuf"
brew "gobject-introspection"
brew "librsvg"
brew "libxslt"
brew "libicns"
brew "libmagic"
brew "libidn2"
brew "unbound"
brew "gnutls"
brew "glew"

# === Casks ===
cask "1password-cli"
cask "android-platform-tools"
cask "macfuse"
cask "ngrok"
cask "qlcolorcode"
cask "qlimagesize"
cask "qlmarkdown"
cask "qlvideo"
cask "quicklook-csv"
cask "quicklook-json"
cask "sf"
cask "visual-studio-code"

# === VS Code Extensions ===
vscode "amazonwebservices.codewhisperer-for-command-line-companion"
vscode "dbaeumer.vscode-eslint"
vscode "dotiful.dotfiles-syntax-highlighting"
vscode "dragos.scala-lsp"
vscode "github.vscode-pull-request-github"
vscode "grapecity.gc-excelviewer"
vscode "mechatroner.rainbow-csv"
vscode "ms-azuretools.vscode-docker"
vscode "ms-python.debugpy"
vscode "ms-python.isort"
vscode "ms-python.python"
vscode "ms-python.vscode-pylance"
vscode "ms-vscode-remote.remote-containers"
vscode "ms-vscode-remote.remote-wsl"
vscode "redhat.java"
vscode "redhat.vscode-commons"
vscode "redhat.vscode-yaml"
vscode "salesforce.salesforce-vscode-slds"
vscode "salesforce.salesforcedx-vscode"
vscode "salesforce.salesforcedx-vscode-apex"
vscode "salesforce.salesforcedx-vscode-apex-debugger"
vscode "salesforce.salesforcedx-vscode-apex-replay-debugger"
vscode "salesforce.salesforcedx-vscode-core"
vscode "salesforce.salesforcedx-vscode-lightning"
vscode "salesforce.salesforcedx-vscode-lwc"
vscode "salesforce.salesforcedx-vscode-soql"
vscode "salesforce.salesforcedx-vscode-visualforce"
vscode "scala-lang.scala"
vscode "scala-lang.scala-snippets"
vscode "scalameta.metals"
vscode "visualstudioexptteam.intellicode-api-usage-examples"
vscode "visualstudioexptteam.vscodeintellicode"
vscode "vscjava.vscode-gradle"
vscode "vscjava.vscode-java-debug"
vscode "vscjava.vscode-java-dependency"
vscode "vscjava.vscode-java-pack"
vscode "vscjava.vscode-java-test"
vscode "vscjava.vscode-maven"
```

**What was removed vs original:**
- Taps: `exolnet/deprecated`, `liamg/tfsec`, `olafurpg/scalafmt`, `shivammathur/php`, `yurikoles/yurikoles`
- Formulas: `hub` (→ `gh`), `emacs`, `chezmoi`, `python@3.9`, `python@3.10`, `ammonite-repl`, `tor`, `torsocks`, `starship`, `cask` (deprecated formula), `shivammathur/php/php@5.6`

**What was added:**
- `python@3.13`

- [ ] **Step 2: Verify Brewfile syntax**

```bash
brew bundle check --file=$DOTFILES/Brewfile 2>&1 | head -20
```

Expected: either `The Brewfile's dependencies are satisfied.` or a list of missing packages (normal if not all are installed locally — syntax errors would look different).

- [ ] **Step 3: Commit**

```bash
git add Brewfile
git commit -m "chore: modernize Brewfile — reorganize by section, prune stale entries, add python@3.13"
```

---

## Success Criteria Verification

Run these after all 8 tasks are complete:

```bash
# 1. Shell loads without errors
exec zsh

# 2. No duplicate Go entries in PATH
echo $PATH | tr ':' '\n' | grep -c "go"
# Expected: 2 (GOROOT/bin and GOPATH/bin, each once)

# 3. NVM lazy-loads
type nvm   # Expected: "nvm not found"
nvm --version  # Expected: triggers load, prints version

# 4. No hardcoded usernames in any zsh/sh file
grep -r "/Users/alex" ~/.dotfiles --include="*.zsh" --include="*.sh"
# Expected: no matches

# 5. localrc.example exists
ls ~/.dotfiles/localrc.example
# Expected: file exists

# 6. Brewfile check
brew bundle check --file=~/.dotfiles/Brewfile
```
