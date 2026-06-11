# Deploy Consultant on Donweb

Target public URL:

```text
https://www.technized.com/consultant
```

Production env values expected in `/var/www/Consultant/.env`:

```text
PUBLIC_SITE_URL=https://www.technized.com/consultant
PUBLIC_PORTAL_BASE_DOMAIN=technized.com
PUBLIC_PORTAL_BASE_PATH=/consultant
PUBLIC_PORTAL_DEFAULT_MODULE=consultant
```

Do not upload the local `dist/` built on Windows to a Linux server. The Astro Node adapter embeds absolute build paths, so build on Donweb.

## Server commands

```bash
cd /var/www/Consultant

npm ci
cp env_prod/.env .env
rm -rf dist .astro
npm run build
```

Install the systemd service:

```bash
sudo cp deploy/systemd-technized-consultant.service /etc/systemd/system/technized-consultant.service
sudo systemctl daemon-reload
sudo systemctl enable --now technized-consultant
sudo systemctl status technized-consultant
```

Add `deploy/nginx-consultant-location.conf` inside the existing HTTPS `server` block for `www.technized.com`, before `location / { return 404; }`, then reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Smoke test:

```bash
curl -I http://127.0.0.1:4324/consultant/login
curl -I https://www.technized.com/consultant
curl -I https://www.technized.com/consultant/login
curl -I https://www.technized.com/consultant/assets/images/up-arrow.png
```
