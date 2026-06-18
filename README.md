<div align = center>

\[cool scrapbox logo goes here\]

scrapbox is a free and open source, privacy respecting, simple file-hosting service. 

it allows you to quickly upload anything and get a shareable link for you to send to others. 

</div>

## Features
- Encrypted Uploads: users can choose to upload files with AES-256-GCM encryption directly in browser.
- Chunked Uploads: large files are split into chunks during upload. 
- Admin Dashboard: adjust your instance's upload settings, terms of service, and site appearance easily.
- Upload Timers: automatically delete files after a set amount of time defined by the users and host.
- Clean UI: no ads and a minimal design

## Run Your Own Instance

The easiest way to host your own instance is using a docker compose and reverse proxy with Caddy. 

1. **Create a `docker-compose.yml` file:**

```yaml
services:
  scrapbox:
    image: syuuzu/scrapbox:latest
    container_name: scrapbox
    volumes:
      - ./database:/app/database:rw
      - ./uploads:/app/uploads:rw
    ports:
      - '3815:3815'
    restart: unless-stopped
```

2. **Start the instance:**

```bash
docker compose up -d
```

Open the instance at `http://localhost:3815` and set up an admin password. You can login to the account at `http://localhost:3815/login`. 

### Reverse Proxy (Recommended)
File encryption might break on certain browsers if scrapbox isn't served over https. You should probably use a reverse proxy like [Caddy](https://github.com/caddyserver/caddy).

**`Caddyfile Example`:**
   ```caddy
   your-domain.com {
       reverse_proxy :3815
   }
   ```

## Planned Features
- Better README: this readme kinda sucks...
- Site Mascot and Branding: every good project has a mascot! 
- Custom CSS support: theme the site to your hearts content. 
- UI Localization: I want to add language options.
- IP Logging Setting: Admin option to enable IP logging of requests for moderation purposes.

## License
This project is licensed under the GPL-3.0 - [LICENSE](LICENSE)
