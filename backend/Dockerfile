# Dockerfile for StudyAI Backend
# This file tells Docker how to build an image for our Node.js application

# ============================================
# Stage 1: Base image
# ============================================
# Start from official Node.js image (Alpine = smaller size)
# We're using Node 20 LTS (Long Term Support)
FROM node:20-alpine

# Set working directory inside the container
# All subsequent commands run from /app
WORKDIR /app

# ============================================
# Stage 2: Install dependencies
# ============================================
# Copy package files first (Docker caches layers)
# If package.json hasn't changed, Docker reuses cached node_modules
COPY package*.json ./

# Install all dependencies (including devDependencies for development)
RUN npm install

# ============================================
# Stage 3: Copy application code
# ============================================
# Copy everything else
# In production, you'd be more selective here
COPY . .

# Generate Prisma client
# This creates the database client based on your schema
RUN npx prisma generate

# ============================================
# Stage 4: Expose port and set default command
# ============================================
# Document that the container listens on port 3000
# (This is just documentation - actual port mapping is in docker-compose.yml)
EXPOSE 3000

# Default command (can be overridden in docker-compose.yml)
CMD ["npm", "run", "dev"]
