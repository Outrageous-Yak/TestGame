# Deploy Wind Composer free on Render (iPhone PWA)

Host Wind Composer on Render’s **free** plan so you can use it on your iPhone without your computer running.

## What you get

- Public **HTTPS** URL (required for iPhone microphone)
- **Add to Home Screen** in Safari
- **$0** on the free plan (service sleeps after ~15 min idle; first load may take 30–60s)

## One-time setup

### 1. Push this repo to GitHub

Use branch `cursor/wind-composer-pwa-1f44` or merge PR #15 into `main`.

### 2. Create a Render account

Sign up at [render.com](https://render.com) (free).

### 3. Deploy with Blueprint

1. Render Dashboard → **New** → **Blueprint**
2. Connect your GitHub repo (`Outrageous-Yak/TestGame` or your fork)
3. Render detects `render.yaml` at the repo root
4. Click **Apply** / **Deploy Blueprint**
5. Choose the **Free** plan when prompted

### Alternative: manual Web Service

1. **New** → **Web Service** → connect repo
2. **Runtime:** Docker
3. **Dockerfile path:** `wind-composer/Dockerfile`
4. **Docker context:** `.` (repository root)
5. **Plan:** Free
6. **Health check path:** `/api/health`
7. Deploy

### 4. Wait for deploy

Build takes ~5–10 minutes (npm + Python). When status is **Live**, copy your URL:

```
https://wind-composer-xxxx.onrender.com
```

## Use on iPhone

1. Open the **https://** URL in **Safari**
2. **Share** → **Add to Home Screen**
3. Open the Home Screen icon
4. Tap **Start** (audio requires a tap)
5. For weather without mic: **Weather** tab → search city → add station → **Start**

Microphone works on HTTPS (unlike plain `http://` on LAN).

## Free plan limits

| Item | Free tier |
|------|-----------|
| Cost | $0 |
| HTTPS | Included |
| Sleep | After ~15 min no traffic |
| Cold start | ~30–60 seconds after sleep |
| Always on | No (upgrade to paid for always-on) |

## Troubleshooting

**Build fails on npm** — ensure `wind-composer/web/package-lock.json` is in the repo.

**502 / not loading** — check Render logs; confirm health check hits `/api/health`.

**Very slow first open** — normal on free tier (service waking from sleep).

**Custom domain** — Render free supports custom domains with HTTPS.

## Redeploy

Push to the connected branch; Render auto-redeploys. Or **Manual Deploy** in the Render dashboard.

## Local vs Render

| | Local `./start.sh` | Render |
|--|-------------------|--------|
| URL | `http://localhost:8000` | `https://….onrender.com` |
| iPhone mic | Needs HTTPS tunnel | Works |
| Computer required | Yes | No |

See also [PWA_README.md](PWA_README.md) for architecture and tests.
