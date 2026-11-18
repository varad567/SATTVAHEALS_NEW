#!/bin/sh
# FILE: e2e/run.sh — build, start a preview server, run browser tests, always stop the server.
set -e
node_modules/.bin/vite build >/dev/null
node_modules/.bin/vite preview --port 4173 --strictPort >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
curl -s -o /dev/null --retry 20 --retry-connrefused --retry-delay 1 http://localhost:4173/
python3 e2e/landing.e2e.py && python3 e2e/app.e2e.py
