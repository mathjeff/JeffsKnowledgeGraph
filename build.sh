#!/bin/bash
set -e
rm out -rf
mkdir -p out/site
python util/formatGraph.py
cp ui/index.html out/site
cp ui/renderer.js out/site
cp deps/marked.min.js out/site
