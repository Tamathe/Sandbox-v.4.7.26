#!/bin/bash
echo "Auto-save running. Press Ctrl+C to stop."
while true; do
  git add .
  git commit -m "Auto-save: $(date)"
  sleep 1800
done
