alias c="clear"          # Clear terminal display
alias reload="exec zsh"  # Reload the shell
alias gbrg='git branch -vv | grep "origin/.*: gone]" | cut -d" " -f3 | xargs git branch -D'
