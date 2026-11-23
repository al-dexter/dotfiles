# Podman's pkg installer registers /opt/podman/bin in /etc/paths.d, but zshrc
# rebuilds PATH from scratch, so add it here. The docker CLI itself is the
# Homebrew formula and talks to Podman through /var/run/docker.sock.
[[ -d /opt/podman/bin ]] && export PATH=/opt/podman/bin:$PATH
fpath=($HOME/.docker/completions $fpath)

# Regenerate _docker whenever the docker binary is newer than it (i.e. after a
# brew upgrade); -nt follows the Homebrew symlink to the real binary.
# Write to a temp file so a failed run keeps the old one.
_docker_completion=$HOME/.docker/completions/_docker
if (( $+commands[docker] )) && [[ ! -f $_docker_completion || $commands[docker] -nt $_docker_completion ]]; then
  mkdir -p ${_docker_completion:h}
  if docker completion zsh > $_docker_completion.tmp 2>/dev/null && [[ -s $_docker_completion.tmp ]]; then
    mv -f $_docker_completion.tmp $_docker_completion
  else
    rm -f $_docker_completion.tmp
  fi
fi

# This file loads after oh-my-zsh has run compinit, so register directly
# instead of re-running compinit.
if (( $+functions[compdef] )) && [[ -f $_docker_completion ]]; then
  autoload -Uz _docker
  compdef _docker docker
fi
unset _docker_completion
