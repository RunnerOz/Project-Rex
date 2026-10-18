#!/bin/bash
# Schedule a release: run this inside the website folder AFTER copying the new version in and BEFORE `git add`.
#   ./tools/release-at.sh +10                    -> the update becomes available 10 minutes from now
#   ./tools/release-at.sh "2026-10-24 12:00"     -> ... at 12:00 (this computer's local time)
# It does two things:
#   1. adds "releaseAt" to version.json, so Rex (V12.9.3 and newer) holds the update back until that time
#   2. writes next-update.json, so Rex shows the countdown before the time
# Everything is uploaded at once; Rex simply does not offer the update until the countdown reaches zero.
# (It uses each device's own clock. Older Rex versions ignore releaseAt and see the update straight away.)
set -e
cd "$(dirname "$0")/.."
[ -f version.json ] || { echo "version.json not found. Run this from the website folder."; exit 1; }
ARG="$1"; [ -n "$ARG" ] || { echo 'Usage: ./tools/release-at.sh +10   or   ./tools/release-at.sh "2026-10-24 12:00"'; exit 1; }
if date -v+1M +%s >/dev/null 2>&1; then BSD=1; else BSD=0; fi
if [[ "$ARG" =~ ^\+([0-9]+)$ ]]; then
  N="${BASH_REMATCH[1]}"
  if [ "$BSD" = 1 ]; then EPOCH=$(date -v+${N}M +%s); else EPOCH=$(date -d "+${N} minutes" +%s); fi
else
  if [ "$BSD" = 1 ]; then EPOCH=$(date -j -f "%Y-%m-%d %H:%M" "$ARG" +%s); else EPOCH=$(date -d "$ARG" +%s); fi
fi
if [ "$BSD" = 1 ]; then AT=$(date -u -r "$EPOCH" +%Y-%m-%dT%H:%M:%SZ); LOCAL=$(date -r "$EPOCH" "+%a %b %e, %l:%M %p"); else AT=$(date -u -d "@$EPOCH" +%Y-%m-%dT%H:%M:%SZ); LOCAL=$(date -d "@$EPOCH" "+%a %b %e, %l:%M %p"); fi
[ "$EPOCH" -gt "$(date +%s)" ] || { echo "That time is already in the past."; exit 1; }
# version.json: add or replace "releaseAt" (keeps everything else exactly as it is)
perl -0pi -e 's/\n  "releaseAt": "[^"]*",//; s/^\{/{\n  "releaseAt": "'"$AT"'",/' version.json
VER=$(perl -ne 'if(/^  "version": "([^"]+)"/){print $1; exit}' version.json)
COMP=$(perl -0ne 'print $1 if /"names": \{[^}]*"computer": "([^"]*)"/' version.json)
PHONE=$(perl -0ne 'print $1 if /"names": \{[^}]*"phone": "([^"]*)"/' version.json)
SUM=$(perl -ne 'if(/^  "summary": "((?:[^"\\]|\\.)*)"/){print $1; exit}' version.json)
cat > next-update.json <<JSON
{
  "version": "$VER",
  "at": "$AT",
  "name": { "computer": "$COMP", "phone": "$PHONE" },
  "title": "",
  "teaser": "$SUM"
}
JSON
echo "Scheduled v$VER for $LOCAL ($AT)."
echo "Written: version.json (releaseAt) and next-update.json. Now: git add -A && git commit && git push"
