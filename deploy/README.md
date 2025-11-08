# Production Deployment

This folder contains production deployment assets for the backend API using Docker Compose and Nginx.

## Prerequisites
- A Linux server (Ubuntu/Debian recommended)
- Docker Engine and Docker Compose v2 installed
- A DNS record pointing to your server (e.g., `your-domain.com`)
- Optional: Nginx with SSL/TLS (Let’s Encrypt via certbot)

## Files
- `docker-compose.prod.yml`: Compose file for Postgres + API (runtime image)
- `.env.production.example`: Template of environment variables for production
- `deploy.sh`: Helper script to start services
- `fms.service`: systemd unit to manage services at boot
- `nginx.conf`: Example reverse proxy config

## Steps
1. Copy the repo to the server, e.g., `/opt/freelance-monitor-system`.
2. Create production env file:
   - `cp deploy/.env.production.example deploy/.env.production`
   - Edit `deploy/.env.production` with strong secrets and correct domain.
3. Build and run API only (no registry) using convenience script:
   - `bash deploy/prod-deploy.sh`
     - Script will load env from `deploy/.env` if present, else `deploy/.env.production`.
   - Options via env vars:
     - `IMAGE_NAME_API=fms-api:latest CONTAINER_NAME_API=fms-api bash deploy/prod-deploy.sh`
     - `ENV_FILE=deploy/.env.production bash deploy/prod-deploy.sh`
   - The script builds `backend/Dockerfile` (target `runtime`), replaces the running container, mounts `-v fms_static:/srv/static`, and waits for health at `/api/health`.
4. Configure Nginx:
   - Install Nginx: `sudo apt-get install nginx`
   - Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/fms.conf`
   - Replace `your-domain.com` and adjust if needed
   - Enable: `sudo ln -s /etc/nginx/sites-available/fms.conf /etc/nginx/sites-enabled/`
   - Test and reload: `sudo nginx -t && sudo systemctl reload nginx`
5. Enable auto-start with systemd:
   - `sudo cp deploy/fms.service /etc/systemd/system/fms.service`
   - Edit `WorkingDirectory=` if your path differs
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable --now fms`

## Notes
- The backend serves `/static` files; a named volume `static_data` persists generated PDFs/uploads.
- The API listens on `127.0.0.1:8080` and is proxied by Nginx.
- Health endpoint: `GET http://127.0.0.1:8080/api/health`

## Updating
- Pull latest code: `git pull`
- Rebuild and restart: `bash deploy/deploy.sh`
