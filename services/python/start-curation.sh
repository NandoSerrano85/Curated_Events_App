#!/bin/bash
# Wrapper script to start curation service with virtual environment

cd "/Users/fserrano/Documents/Startups/Events App/services/python/curation-service"
source ../events-venv/bin/activate
exec python main.py