#!/bin/bash

# Terminate all background processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "========================================="
echo "Starting Semendproject Services..."
echo "========================================="

# 1. Start Node comments/likes service on port 5000
echo "[1/3] Starting Node.js Service (Port 5000)..."
cd /app/node-service
PORT=5000 NODE_ENV=production node server.js > /app/node-service.log 2>&1 &

# 2. Start Spring Boot Java backend on port 8080
echo "[2/3] Starting Spring Boot Backend (Port 8080)..."
cd /app
PORT=8080 java -jar backend.jar > /app/springboot_backend.log 2>&1 &

# Wait for microservices to initialize
echo "Waiting for services to boot up..."
sleep 8

# 3. Start Python FastAPI Gateway on Render's assigned PORT (defaults to 8000)
echo "[3/3] Starting Python Gateway on Port ${PORT:-8000}..."
cd /app/gateway
# Use the virtual environment python interpreter to run uvicorn
/app/venv/bin/uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
