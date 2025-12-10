# 🚀 Deployment Guide - DigitalOcean Droplet

## Prerequisites

- Ubuntu 20.04+ DigitalOcean Droplet
- Domain name pointed to your droplet's IP
- SSH access to your server

## 1. Server Setup

### Install Node.js & PM2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2 pnpm

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### Create Application Directory

```bash
# Create app directory
sudo mkdir -p /var/www/scavenger-hunt
sudo chown $USER:$USER /var/www/scavenger-hunt
cd /var/www/scavenger-hunt
```

## 2. Deploy Application

### Clone & Build

```bash
# Clone your repository
git clone https://github.com/yourusername/scavenger-hunt.git .

# Install dependencies
pnpm install

# Create production environment file
cp .env.example .env
nano .env
```

### Configure Environment (.env)

```bash
# Database
DATABASE_URL="file:./local.db"

# AI Service
GEMINI_API_KEY="your_production_gemini_key"

# Server
NODE_ENV="production"
PORT=3000
HOST="localhost"
```

### Build & Setup Database

```bash
# Build the application
pnpm build

# Setup database
pnpm db:push
pnpm db:seed

# Create necessary directories
mkdir -p uploads logs
```

## 3. Configure Nginx

### Copy Nginx Configuration

```bash
# Copy the nginx.conf to sites-available
sudo cp nginx.conf /etc/nginx/sites-available/scavenger-hunt

# Update domain name in the config
sudo nano /etc/nginx/sites-available/scavenger-hunt
# Replace 'your-domain.com' with your actual domain

# Enable the site
sudo ln -s /etc/nginx/sites-available/scavenger-hunt /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Setup SSL with Let's Encrypt

```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (optional, usually automatic)
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 4. Start with PM2

### Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

### PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs scavenger-hunt

# Restart app
pm2 restart scavenger-hunt

# Stop app
pm2 stop scavenger-hunt

# Monitor
pm2 monit
```

## 5. Firewall Configuration

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 6. Monitoring & Maintenance

### Log Locations

- Application logs: `./logs/`
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `pm2 logs`

### Health Checks

- App status: `pm2 status`
- Nginx status: `sudo systemctl status nginx`
- SSL status: `sudo certbot certificates`

### Backup Database

```bash
# Run daily via cron
crontab -e
# Add: 0 2 * * * /var/www/scavenger-hunt/backup.sh
```

## 🎯 Quick Deployment Checklist

- [ ] Server setup complete
- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Database seeded
- [ ] PM2 running
- [ ] Nginx configured
- [ ] Firewall configured
- [ ] Backups scheduled

Your Holiday Scavenger Hunt should now be live! 🎄✨
