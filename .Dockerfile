# Use Node.js official image
FROM node:22

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
  libglib2.0-0 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libasound2 \
  fonts-liberation \
  libxshmfence1 \
  libxext6 \
  wget \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency files first (for better Docker caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of your app
COPY . .

# Run the bot
CMD ["npm", "start"]
