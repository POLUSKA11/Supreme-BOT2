FROM node:20-slim

# Install build and audio dependencies
# Note: libcairo2-dev, libpango1.0-dev, libjpeg-dev, libgif-dev, librsvg2-dev
# are required by @napi-rs/canvas (used by discord-player-googlevideo and rank cards)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    libtool \
    autoconf \
    automake \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the dashboard
RUN cd dashboard && npm install --legacy-peer-deps && npm run build

# Prune root dependencies to production only
RUN npm prune --production

# Create data directory for any remaining local storage/backups
RUN mkdir -p data

# Environment variables
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# Start script that runs migration then the bot
CMD ["sh", "-c", "node migrateToTiDB.js && node index.js"]
