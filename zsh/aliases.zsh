alias c="clear"          # Clear terminal display
alias reload="exec zsh"  # Reload the shell
alias gbrg='git branch -vv | grep "origin/.*: gone]" | cut -d" " -f3 | xargs git branch -D'
alias la='lsd -lha'
alias ll='lsd -lh'
alias ls='lsd --color=auto'
alias python=$(brew --prefix python3)/bin/python3
alias pip=$(brew --prefix python3)/bin/pip3


