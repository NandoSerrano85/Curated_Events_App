#!/bin/bash
# Wrapper script to start analytics service with virtual environment

cd "/Users/fserrano/Documents/Startups/Events App/services/python/analytics-service"
source ../events-venv/bin/activate
exec python main.py