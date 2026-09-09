#!/bin/zsh
set -eu
project_dir="${0:A:h}"
export SAND_USER_DATA_DIR="$HOME/Library/Application Support/Grok Bot 0.18 Reconstructed"
export SAND_DATA_ROOT="$SAND_USER_DATA_DIR/data"
app_path="/Applications/CodexBot.app"
if [[ ! -d "$app_path" ]]; then
  app_path="$project_dir/dist/CodexBot.app"
fi
exec "$app_path/Contents/MacOS/Grok Bot"
