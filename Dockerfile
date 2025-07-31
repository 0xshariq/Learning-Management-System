# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install system dependencies including FFmpeg
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Create directories for video streams
RUN mkdir -p public/streams public/videos

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Build the application
RUN pnpm build

# Start the application
CMD ["pnpm", "start"]
