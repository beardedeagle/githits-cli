#!/bin/sh
# Scan staged changes with the same gitleaks OSS release CI installs.
set -eu

cd "$(dirname "$0")/.."

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks 8.30.1 is not on PATH." >&2
  echo "Install the OSS binary from https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1" >&2
  exit 1
fi

version="$(gitleaks version 2>/dev/null | tr -d '[:space:]' || true)"
case "$version" in
  8.30.1) ;;
  *)
    echo "gitleaks 8.30.1 is required for this repository (found: ${version:-unknown})." >&2
    exit 1
    ;;
esac

exec gitleaks git --staged --redact --no-banner --no-color
