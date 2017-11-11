export LSCOLORS="exfxcxdxbxegedabagacad"
export CLICOLOR=true

# You may need to manually set your language environment
export LANG=en_US.UTF-8

# Compilation flags
export ARCHFLAGS="-arch x86_64"

fpath=($ZSH/functions $fpath)

autoload -U $ZSH/functions/*(:t)

HISTFILE=~/.zsh_history
HISTSIZE=30000
SAVEHIST=30000

setopt HIST_IGNORE_SPACE
setopt LOCAL_OPTIONS # allow functions to have local options
setopt LOCAL_TRAPS # allow functions to have local traps
setopt HIST_VERIFY
setopt SHARE_HISTORY # share history between sessions ???
setopt EXTENDED_HISTORY # add timestamps to history
setopt PROMPT_SUBST
setopt CORRECT
setopt COMPLETE_IN_WORD
setopt IGNORE_EOF

setopt APPEND_HISTORY # adds history
setopt HIST_IGNORE_ALL_DUPS  # don't record dupes in history
setopt HIST_REDUCE_BLANKS

# don't expand aliases _before_ completion has finished
#   like: git comm-[tab]
setopt complete_aliases
