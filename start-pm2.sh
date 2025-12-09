#!/bin/bash

# Blaxk_TCF WhatsApp Bot - Render Startup Script
# This script starts PM2 and the bot on Render

set -e

echo "🚀 Starting Blaxk_TCF WhatsApp Bot with PM2..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start PM2 with ecosystem config
echo "⚙️ Starting bot with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot (for Render restarts)
pm2 startup -u node --hp /home/node

# Tail logs
echo "✅ Bot started! Monitoring logs..."
pm2 logs blaxk-bot
