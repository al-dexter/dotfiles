export PATH=$HOME/.rd/bin:$PATH
fpath=($HOME/.docker/completions $fpath)

# Rancher Desktop's docker CLI. Regenerate _docker whenever the docker binary
# is newer than it (i.e. after a Rancher upgrade); -nt follows the ~/.rd/bin
# symlink to the real binary. Write to a temp file so a failed run keeps the old one.
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
