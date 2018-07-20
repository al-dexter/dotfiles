alias c="clear"          # Clear terminal display
alias reload="exec zsh"  # Reload the shell
alias grmp='git branch -vv | grep "origin/.*: gone]" | cut -d" " -f3 | xargs git branch -D'
