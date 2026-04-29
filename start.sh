#!/bin/bash
set -e

cd "$(dirname $0)"
./build.sh
cd out/site

echo
echo "Open http://localhost:8000/index.html in a web browser"
echo
echo "Press ctrl-C when done"
echo

python3 -m http.server
