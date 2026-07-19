# Stage 1: Build Java Backend
FROM maven:3.8.8-eclipse-temurin-17-alpine AS java-build
WORKDIR /app/backend
COPY backend/demo/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/demo/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Build React Frontend
FROM node:18-alpine AS node-build
WORKDIR /app/frontend
COPY frontend/Semendproject/package*.json ./
RUN npm ci
COPY frontend/Semendproject/ ./
# Inject Same-Origin API Base URL for Production Compilation
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

# Stage 3: Unified Runtime Environment
FROM ubuntu:22.04

# Avoid prompt questions during install
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies (Java 17, Node.js 18, Python 3)
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set up Python virtual environment to prevent PEP 668 conflicts
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install --upgrade pip
RUN /app/venv/bin/pip install fastapi uvicorn requests

# Copy backend JAR
COPY --from=java-build /app/backend/target/*.jar backend.jar

# Copy compiled frontend
COPY --from=node-build /app/frontend/dist ./frontend/Semendproject/dist

# Copy comments & likes Node service
COPY node-service ./node-service
RUN cd node-service && npm ci --only=production

# Copy gateway service
COPY gateway ./gateway

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Render will override or bind to the port defined in PORT environment variable (FastAPI runs on it)
EXPOSE 8000

CMD ["./start.sh"]
