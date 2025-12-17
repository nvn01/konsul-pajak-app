# Deployment Instructions for Konsul Pajak Applications

## Overview
This guide will help you build, push, and deploy both the landing page and chat application to your staging server.

## Prerequisites
- Docker installed on your local machine
- Docker Hub account (novn01)
- Access to the server at `ubserver1`
- .env file already on server at `/docker/konsul-pajak/.env`

## Step 1: Build Docker Images Locally

### Build Landing Page
```bash
cd C:\Users\Novandra Anugrah\Desktop\SKRIPSI\03_Source_Code\landing-page
docker build -t novn01/konsul-pajak-landing:latest .
```

### Build Chat Application
```bash
cd C:\Users\Novandra Anugrah\Desktop\SKRIPSI\03_Source_Code\konsul-pajak-App
docker build -t novn01/konsul-pajak-chat:latest .
```

## Step 2: Push Images to Docker Hub

### Login to Docker Hub (one time)
```bash
docker login
# Username: novn01
# Password: <your-docker-hub-password>
```

### Push Both Images
```bash
docker push novn01/konsul-pajak-landing:latest
docker push novn01/konsul-pajak-chat:latest
```

## Step 3: Deploy on Server

### Upload docker-compose.yml to Server
Copy the `docker-compose.yml` file to the server:
```bash
# From your local machine
scp C:\Users\Novandra Anugrah\Desktop\SKRIPSI\03_Source_Code\docker-compose.yml root@ubserver1:/docker/konsul-pajak/
```

### SSH into Server and Deploy
```bash
ssh root@ubserver1
cd /docker/konsul-pajak

# Verify .env file exists
ls -la .env

# Pull latest images
docker compose pull

# Start services
docker compose up -d

# Check logs
docker compose logs -f
```

## Step 4: Configure Cloudflare DNS

Add the following DNS records in Cloudflare (pointing to your tunnel):
- `landing.novn.my.id` → Your Cloudflare Tunnel
- `chat.novn.my.id` → Your Cloudflare Tunnel

## Step 5: Verify Deployment

Visit the following URLs to verify:
- Landing Page: https://landing.novn.my.id
- Chat Application: https://chat.novn.my.id

## Troubleshooting

### View Logs
```bash
docker compose logs landing    # Landing page logs
docker compose logs chat        # Chat app logs
```

### Restart Services
```bash
docker compose restart
```

### Rebuild and Redeploy
If you make code changes:
1. Rebuild images locally
2. Push to Docker Hub
3. On server: `docker compose pull && docker compose up -d`

Or let Watchtower auto-update (checks every few hours)

## Auto-Updates with Watchtower

Both services have Watchtower labels enabled. Watchtower will automatically:
- Check for new images on Docker Hub
- Pull and restart containers with new versions
- Keep your apps up-to-date automatically

## Quick Deployment Commands

For future updates, use this single command:
```bash
# Local - Build and push everything
docker build -t novn01/konsul-pajak-landing:latest ./landing-page && \
docker build -t novn01/konsul-pajak-chat:latest ./konsul-pajak-App && \
docker push novn01/konsul-pajak-landing:latest && \
docker push novn01/konsul-pajak-chat:latest
```

```bash
# Server - Pull and restart
cd /docker/konsul-pajak && docker compose pull && docker compose up -d
```
