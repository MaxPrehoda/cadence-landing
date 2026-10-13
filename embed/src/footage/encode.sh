#!/bin/bash
# Loops and encodes recorded masters into ../../../media/:
#   node clips.mjs [name…] && ./encode.sh name…
# Needs the landing repo served at $SITE (default http://localhost:8090,
# e.g. `python3 -m http.server 8090` in cadence-landing) and embed/app built.
# Output: 1600x1000 H.264 yuv420p faststart (CRF 21) + VP9 webm + poster.
# The poster is the moment each clip is about (seconds into the loop), not its
# opening frame: it is all a visitor sees before the clip plays, and the only
# thing with reduced motion on.
set -e
cd "$(dirname "$0")"
OUT=../../../media
mkdir -p $OUT
poster_at() {
  case $1 in
    toolbar) echo 7.0 ;;    # peek open: billing amber, docs green
    inbox) echo 2.1 ;;      # answered with 1, take-back running
    talk) echo 5.6 ;;       # "Sent to Billing webhooks" receipt
    dictation) echo 5.6 ;;  # the dictated sentence just landed
    director) echo 6.4 ;;   # the full "before you can ship" answer
    sets) echo 4.95 ;;      # pointer on "Put away as a set"
    *) echo 0 ;;
  esac
}
for n in "$@"; do
  M=out/$n.master.mp4
  D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $M)
  OFF=$(python3 -c "print(round($D-0.55,3))")
  # Loop: the last 0.55 s dissolves into the opening frame.
  ffmpeg -loglevel error -y -i $M -filter_complex "[0]split[a][b];[b]trim=end_frame=1,loop=loop=-1:size=1,trim=duration=0.55,setpts=PTS-STARTPTS,fps=30[first];[a]trim=duration=$D,fps=30,setpts=PTS-STARTPTS[main];[main][first]xfade=transition=fade:duration=0.55:offset=$OFF,format=yuv444p[v]" -map "[v]" -c:v libx264 -preset slow -crf 6 out/$n.loop.mp4
  ffmpeg -loglevel error -y -i out/$n.loop.mp4 -an -c:v libx264 -preset veryslow -crf ${CRF:-21} -profile:v high -pix_fmt yuv420p -tune animation -movflags +faststart $OUT/$n.mp4
  ffmpeg -loglevel error -y -i out/$n.loop.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf ${VCRF:-36} -row-mt 1 -deadline good -cpu-used 1 -pix_fmt yuv420p $OUT/$n.webm
  ffmpeg -loglevel error -y -ss $(poster_at $n) -i out/$n.loop.mp4 -frames:v 1 -q:v 3 $OUT/$n-poster.jpg
  ls -la $OUT/$n.* $OUT/$n-poster.jpg
done
