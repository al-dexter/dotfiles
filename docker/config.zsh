# Podman has no built-in BuildKit, so builds run in a docker-container buildx
# builder. Plain `docker build` ignores `buildx use` and picks the context's
# default builder, which leaves results in the build cache only; route it
# through podman-load (default-load=true, created by docker/install.sh).
export BUILDX_BUILDER=podman-load
