# dotfiles (based on [holman/dotfiles](https://github.com/holman/dotfiles))

## Topics

Everything's built around topic areas. If you're adding a new area — say, "rust" — add a `rust` directory and put files in there. Files with `.zsh` extension are automatically loaded into your shell. Files with `.symlink` are symlinked into `$HOME` when you run `script/bootstrap`.

## Components

- **bin/**: Anything in `bin/` will get added to your `$PATH` and be available everywhere.
- **Brewfile**: Applications managed by [Homebrew Bundle](https://github.com/Homebrew/homebrew-bundle). Edit before running initial setup.
- **topic/*.zsh**: Any files ending in `.zsh` get loaded into your environment.
- **topic/path.zsh**: Loaded first — use to set up `$PATH` or similar.
- **topic/install.sh**: Executed when you run `script/install`. Uses `.sh` extension to avoid auto-loading.
- **topic/*.symlink**: Symlinked into `$HOME` on bootstrap (without the `.symlink` extension).

## Active Topics

| Topic | Purpose |
|-------|---------|
| `aws` | AWS CLI default profile (set in `~/.localrc`), SSO login notes |
| `coursier` | Coursier (Scala artifact manager) configuration |
| `docker` | Homebrew docker CLI running against Podman: completions, `/opt/podman/bin` on PATH, `BUILDX_BUILDER`; `install.sh` links the compose/buildx plugins and creates the `podman-load` builder (see [Podman](#podman)) |
| `gcp` | Google Cloud SDK path and config |
| `git` | Git config (symlinked) and git-extras completions |
| `golang` | Go path and environment ($GOPATH, GOROOT) |
| `herdr` | Herdr app mods (GitLab MR and Jira sidebars), layout and keys, linked into `~/.config/herdr-app` by `install.sh`; needs `HERDR_JIRA_SITE` in `~/.localrc` and the Keychain item `herdr-jira` |
| `homebrew` | Homebrew environment setup and Brewfile management |
| `java` | Java environment (managed via SDKMAN) |
| `k8s` | Kubernetes CLI (kubectl) config |
| `nvm` | Node Version Manager config (with lazy-loading) |
| `python` | Python 3 path and environment |
| `rust` | Rust/Cargo path |
| `scala` | Scala path and configuration |
| `spark` | Apache Spark path |
| `system` | Core PATH ordering, base environment, editor, locale |
| `vim` | Vim config (symlinked) |
| `zsh` | Shell config, aliases, history, and explicit plugin sourcing |

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

### Podman

`brew bundle` installs Podman Desktop, but the container engine and Compose need two clicks in the app before `docker/install.sh` can wire them up:

1. Open Podman Desktop and create/start the Podman machine.
2. **Settings → CLI Tools → Compose → Install** (puts `docker-compose` in `/usr/local/bin`).
3. **Settings → Docker Compatibility → enable** (points `/var/run/docker.sock` at Podman).
4. Run `script/install` again to link the plugins and create the `podman-load` buildx builder.

If the Compose install fails with `cp: /usr/local/bin/docker-compose: No such file or directory`, a dangling symlink from an old Docker Desktop install is in the way — remove the broken links in `/usr/local/bin` and `~/.docker/cli-plugins` and retry.

## Thanks

[Zach Holman](https://github.com/holman) for his [dotfiles](https://github.com/holman/dotfiles) approach.
