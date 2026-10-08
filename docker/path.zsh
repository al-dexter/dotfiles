export PATH=$HOME/.rd/bin:$PATH
fpath=($HOME/.docker/completions $fpath)

# Rancher Desktop's docker CLI; _docker generated via `docker completion zsh`.
# This file loads after oh-my-zsh has run compinit, so register directly
# instead of re-running compinit.
if (( $+functions[compdef] )) && [[ -f $HOME/.docker/completions/_docker ]]; then
  autoload -Uz _docker
  compdef _docker docker
fi
