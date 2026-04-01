#!/bin/bash

FILES=$(git ls-files -m)

if [ -z "$FILES" ]; then
  echo "No changes"
  exit 0
fi

git add $FILES
git commit -m "chore: commit recent changes"