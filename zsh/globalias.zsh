# Overwrite oh-my-zsh's version of `globalias', which makes globbing and
# on-the-fly shell programming painful. The only difference to the original
# function definition is that we do not use the `expand-word' widget and we
# have inverted the key bindings.
# See https://github.com/robbyrussell/oh-my-zsh/issues/6123 for discussion.
globalias() {
   zle _expand_alias
   #zle expand-word
   #zle self-insert
}
zle -N globalias

# space to make a normal space
bindkey -M emacs " " magic-space
bindkey -M viins " " magic-space

# control-space expands all aliases, including global
bindkey -M emacs "^ " globalias
bindkey -M viins "^ " globalias

# normal space during searches
bindkey -M isearch " " magic-space
