# Live Instagram Follower Counter — Setup

## What you need before deploying
1. **IG_USER_ID** — your Instagram *Business Account ID* (not your @username).
2. **IG_ACCESS_TOKEN** — a valid Graph API access token with `instagram_basic` permission for that account.

### How to get IG_USER_ID
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app, select your access token (must include `instagram_basic` and be linked to the Facebook Page connected to your IG Business account).
3. Query: `GET /me/accounts` → find your Page → copy its `id`.
4. Query: `GET /{page-id}?fields=instagram_business_account` → this returns your `IG_USER_ID`.

### How to get a long-lived IG_ACCESS_TOKEN
Short-lived tokens from the Graph API Explorer expire in ~1 hour. Exchange it for a long-lived one (60 days):

```
GET https://graph.facebook.com/v20.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={your-app-id}
  &client_secret={your-app-secret}
  &fb_exchange_token={short-lived-token}
```

Save the returned `access_token` — that's your `IG_ACCESS_TOKEN`.

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it with the Vercel CLI).
2. In the Vercel dashboard → your project → **Settings → Environment Variables**, add:
   - `IG_USER_ID` = your Instagram Business Account ID
   - `IG_ACCESS_TOKEN` = your long-lived access token
3. Redeploy so the function picks up the env vars.
4. Visit your deployed URL — the counter will fetch `/api/followers` every 8 seconds and animate real changes.

## Notes / limits
- Instagram does **not** provide a true per-follow event stream — this polls the current total every few seconds, which is as "live" as the platform allows.
- Instagram doesn't expose *who* followed you via this endpoint, so the event log shows "+N new followers" rather than fake usernames.
- Long-lived tokens expire after 60 days — you'll need to refresh `IG_ACCESS_TOKEN` periodically (or build a refresh flow if you want this running long-term).
- Never put the access token directly in the HTML/JS — it must only live in the Vercel environment variable, read by `/api/followers.js` on the server side.
