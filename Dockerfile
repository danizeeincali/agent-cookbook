# R&R System Dockerfile
FROM node:20-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/rr-store/package*.json ./packages/rr-store/
COPY packages/rr-discover/package*.json ./packages/rr-discover/
COPY packages/rr-receipts/package*.json ./packages/rr-receipts/
COPY packages/rr-client/package*.json ./packages/rr-client/
COPY packages/rr-node/package*.json ./packages/rr-node/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/data

# Start the server
CMD ["node", "packages/rr-node/dist/server.js"]
