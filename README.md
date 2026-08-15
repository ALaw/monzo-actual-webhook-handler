# Monzo to Actual webhook receiver

A minimal best-effort bridge that imports Monzo transaction webhooks into Actual Budget. TrueLayer remains the eventual fallback.

## Configure and run

Use Node.js 20 or later. Copy `.env.example` to `.env` and fill every value. Map each Monzo account explicitly to its destination Actual account:

```env
ACCOUNT_MAPPINGS=acc_current=actual-current-uuid,acc_flex=actual-flex-uuid
```

Malformed mappings and duplicate Monzo account IDs stop startup. The `@actual-app/api` dependency in `package.json` **must match the deployed Actual server version** before building.

```sh
npm ci
npm test
npm run build
npm start
```

Docker publishes the receiver only on host loopback at `127.0.0.1:8787`; it accepts `POST /monzo/<WEBHOOK_SECRET>`. Generate a new 256-bit secret, for example with `openssl rand -hex 32`; never commit it.

## NAS deployment

Ensure `ACTUAL_SERVER_URL` is reachable from this container (container loopback is not the NAS host), then run:

```sh
docker compose up -d --build
sudo docker exec tailscale tailscale funnel --bg --https=8443 http://127.0.0.1:8787
docker compose logs -f monzo-actual-webhook
```

Register `https://arrakis.tailfd0f75.ts.net:8443/monzo/<WEBHOOK_SECRET>` separately against both the Monzo Current and Flex account IDs. Monzo registrations are account-specific even though both accounts use the same URL. Do not enable Funnel on port 443.

For live acceptance, make one small purchase from each account and confirm that each appears only in its mapped Actual account. Flex webhook delivery must be checked explicitly.

## Rollback

Delete both account-specific webhook registrations, disable the 8443 Funnel (`sudo docker exec tailscale tailscale funnel --https=8443 off`), and run `docker compose down`. TrueLayer continues unchanged.

Before production acceptance, verify that repeated imports of the same `imported_id` change pending to cleared without duplication, compare the Monzo ID with TrueLayer's provider transaction ID, and validate the `include_in_spending` rule against sanitized Pot-transfer captures.
