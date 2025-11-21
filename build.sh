#!/bin/bash
set -e
rm -rf out
mkdir -p out/site
python util/formatGraph.py

# outputs the hash of a file
function getHash() {
  filepath="$1"
  sha1sum "$filepath" | sed 's/ .*//'
}

# chooses a name for a file based on the version
function chooseVersionedName() {
  filepath="$1"
  hash="$(getHash "$filepath")"
  filename="$(basename "$filepath")"
  echo "$filename" | sed "s/\./-$hash\./"
}

renamingArguments=""

# copies the file into the given directory, adds the version into the filename, and notes the renaming
function copyAndAddVersion() {
  inputFilePath="$1"
  destDir="$2"
  inputFileName="$(basename "$inputFilePath")"
  destFilename="$(chooseVersionedName "$inputFilePath")"
  cp "$inputFilePath" "${destDir}/${destFilename}"
  renamingArguments="$renamingArguments -e s/${inputFileName}/${destFilename}/"
}

echo Copying files
copyAndAddVersion ui/renderer.js out/site
copyAndAddVersion out/work/knowledge.json.js out/site
cp deps/marked.min.js out/site
cp ui/KnowledgeGraph.css out/site
# copy the html page and update and file references in it
cat ui/index.html | sed $renamingArguments > out/site/index.html
echo Done building
