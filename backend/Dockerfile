# Dockerfile for StudyAI Backend

# Start from Node.js 20 on Alpine
FROM node:20-alpine

# Install OpenSSL (required for Prisma on Alpine)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything else
COPY . .

# Generate Prisma client for Linux
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Default command
CMD ["npm", "run", "dev"]