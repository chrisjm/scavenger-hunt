#!/bin/bash
echo "🚀 Deploying Scavenger Hunt..."

# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Build application
pnpm build

# Restart with PM2
pm2 restart scavenger-hunt

echo "✅ Deployment complete!"
