#!/bin/bash
# Wrapper script to start recommendation engine with virtual environment

cd "/Users/fserrano/Documents/Startups/Events App/services/python/recommendation-engine"
source ../events-venv/bin/activate
exec python main.py