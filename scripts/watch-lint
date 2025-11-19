#!/bin/bash

SCRIPT_DIR="$(realpath "$(dirname "${BASH_SOURCE[0]}")")"
ROOT_DIR="$SCRIPT_DIR/.."
SRC_DIR="$ROOT_DIR/src"

while inotifywait -e modify,create,delete -r "$SRC_DIR"; do
  cd "$ROOT_DIR" && bun tsc --noEmit && bun check
done
