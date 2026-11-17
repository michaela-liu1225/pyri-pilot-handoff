# Deploy and demonstrate

The assessment asks for a running service, reproducible steps, a persistent handoff and a demonstrated failure/recovery case. We supply two routes: a Docker Compose deployment and a Python process fallback. An optional Cloudflare Quick Tunnel makes either reachable over temporary HTTPS without a hosting account. A temporary tunnel is acceptable for this assessment; it is **not** a production hosting solution or an uptime guarantee.

Use only the included public historical and fictional exercise data. Authentication is a shared demo login, not per-user or multi-tenant authorization. Do not reuse personal passwords, production keys or customer data. Explain the relevant production gaps in your presentation.

## 1. Set a private demo login

From the candidate directory:

```sh
python scripts/setup_demo.py
```

Save the generated password privately. The username is `reviewer`; `.env` contains only a SHA-256 hash. The file is excluded from Git and Docker build context. The script refuses to overwrite an existing `.env`. To rotate the password, deliberately remove that file, rerun setup, then restart/recreate the app. Share the password with the reviewers privately.

## 2A. Docker Compose route

Requires Docker with Linux containers and the Compose plugin. Check `docker version` and `docker compose version` first.

```sh
docker compose up --build -d app
docker compose ps
docker compose logs --tail=30 app
```

Open http://127.0.0.1:8000 and use the generated login. The app port is bound to loopback. A named `handoffs` volume stores SQLite data outside the container's writable layer. Do not use `docker compose down -v` when testing persistence: it deletes that volume.

For a temporary remote URL:

```sh
docker compose --profile preview up -d
docker compose logs --tail=60 preview
```

Open the `https://...trycloudflare.com` URL in the logs. The demo login still applies. The preview reaches only this app service. Keep Docker running for the review call. Record the image/version you used; the helper image is pinned in the released Compose file.

## 2B. Python process fallback

If Docker is not available, use the virtual environment from README.md:

```sh
python scripts/serve_demo.py
```

This loads the demo hash, starts on loopback and writes handoffs under `runtime/`. Install `cloudflared` from [Cloudflare's official downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). In another terminal:

```sh
cloudflared tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:8000
```

Use the printed HTTPS URL and the same demo login. Leave both processes running during review. If a network blocks tunnels, contact us promptly; do not purchase hosting just for this exercise. Another host is fine if it preserves storage and demo access. Document the runtime, startup command, storage, health endpoint and limitations.

## 3. Prove operation, persistence and recovery

1. Open `/healthz`; expect `{"status":"ok","version":"1.2"}`. This checks the app and storage, not whether every upstream feed is healthy.
2. Save a Pine Ridge handoff, record its ID, and restart the app (`docker compose restart app`, or stop/restart the Python process). Reopen the handoff and compare its saved evidence. Repeat for your Upper Alder implementation.
3. Select **Unavailable fixture**, then **Normal** in the UI. Demonstrate what the user sees and how the briefing recovers. Exercise **Stale fixture** if useful. Evidence provenance and the saved handoff must remain understandable throughout.
4. Check logs and run `python -m unittest discover -s tests -v`. Explain a test that would catch a consequential mistake in your addition.
5. Open the HTTPS URL in a separate browser session. Confirm the login is required and the reviewer can complete the main journey. Restarting the tunnel changes its URL; include the latest link with your submission.

## Lifecycle and commercial limits

Stop the preview when no longer needed: `docker compose --profile preview down` (without `-v`), or stop the tunnel/process. The named volume or `runtime/` directory retains handoffs unless deliberately removed. A tunnel URL depends on the host machine and process remaining online. Shared login, single-instance SQLite, local storage, manual deployment, no backup/restore automation and no tenant isolation are deliberate starter limits. Identify the highest-priority change for a paying pilot; implementing all of these is outside the timebox.

References: [Docker Compose](https://docs.docker.com/compose/) and [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
