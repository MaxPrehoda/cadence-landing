#!/bin/bash
# Rebuilds embed/app/ (the real Cadence toolbar, panel and Talk pages) from a
# voice-flow checkout. Usage: embed/build.sh [path/to/voice-flow]
# Needs the checkout's dependencies installed (pnpm install). The checkout is
# only read: the vite config is embed/src/build.mjs and output lands here.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export VOICE_FLOW="${1:-${VOICE_FLOW:-/home/user/voice-flow}}"
node "$HERE/src/build.mjs"
git -C "$VOICE_FLOW" status --short | grep . && echo "warning: voice-flow has changes" >&2 || true
