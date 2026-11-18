#!/bin/bash
# Turns a folder of loop frames (from loop.js) into what the page plays:
#   art/ink/encode.sh <frames dir> <name> <dest dir> [poster.png]
# -> <dest>/<name>.webp (a lossless animated WebP at the picture's own pixel size: exact colours, and about half the
#    size of H.264 or VP9 for this kind of picture), <dest>/<name>.json, and the poster (frame 0 at screen size).
set -e
FR=$1; NAME=$2; DEST=$3; POSTER=$4
FPS=$(python3 -c "import json;print(json.load(open('$FR/meta.json'))['fps'])")
PX=$(python3 -c "import json;print(json.load(open('$FR/meta.json'))['px'])")
mkdir -p "$DEST"
ffmpeg -loglevel error -y -framerate $FPS -i "$FR/frame-%04d.png" -c:v libwebp_anim -lossless 1 -compression_level 6 -loop 0 "$DEST/$NAME.webp"
cp "$FR/meta.json" "$DEST/$NAME.json"
if [ -n "$POSTER" ]; then ffmpeg -loglevel error -y -i "$FR/frame-0000.png" -vf "scale=iw*$PX:ih*$PX:flags=neighbor" "$POSTER"; fi
ls -la "$DEST/$NAME".*
