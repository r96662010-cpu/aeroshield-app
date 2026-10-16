# AeroShield Deployment Guide

AeroShield is a full-stack real-time air quality intelligence platform featuring an Express backend with Google OAuth authentication and a Vite React PWA frontend.

---

## 1. Live Instant Access (Already Deployed)
Your application is already deployed and live in the AI Studio cloud:
- **Shared Live URL**: `https://ais-pre-jv3w6vg3nefv5xa2z7m7zo-934442457134.asia-southeast1.run.app`
- **Development URL**: `https://ais-dev-jv3w6vg3nefv5xa2z7m7zo-934442457134.asia-southeast1.run.app`

You can click the **Share** button in the top-right toolbar of Google AI Studio to share this URL or invite team members.

---

## 2. Deploy on Free Cloud Providers (Render / Railway / Fly.io)

### Option A: Render (Free Web Service)
1. Push your repository to GitHub or GitLab.
2. Sign up on [render.com](https://render.com) and click **New + > Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: `(generate a random 32-character string)`
   - `ADMIN_EMAIL`: `r96662010@gmail.com`
6. Click **Deploy Web Service**.

### Option B: Railway (Free / Hobby)
1. Sign up on [railway.app](https://railway.app).
2. Click **New Project > Deploy from GitHub repo**.
3. Select this repository. Railway automatically reads `package.json` and runs `npm run build` and `npm start`.
4. Add environment variable `ADMIN_EMAIL=r96662010@gmail.com`.
5. Your service will generate a live HTTPS URL.

---

## 3. Deploy via Docker Container

You can build and run AeroShield anywhere with Docker (Google Cloud Run, AWS ECS, DigitalOcean, or any VPS):

```bash
# 1. Build the production Docker image
docker build -t aeroshield:latest .

# 2. Run the container locally or on a server
docker run -d -p 3000:3000 \
  -e ADMIN_EMAIL="r96662010@gmail.com" \
  -e SESSION_SECRET="your-secure-random-secret-key" \
  --name aeroshield aeroshield:latest

# 3. Access your application
curl http://localhost:3000/api/health
```

---

## 4. Deploy to Google Cloud Run

To deploy directly to your Google Cloud account:

```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# Build and submit the container to Google Artifact Registry / Container Registry
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/aeroshield

# Deploy container to Cloud Run
gcloud run deploy aeroshield \
  --image gcr.io/YOUR_GCP_PROJECT_ID/aeroshield \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars ADMIN_EMAIL="r96662010@gmail.com"
```

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `PORT` | Listening server port | `3000` |
| `NODE_ENV` | Environment mode (`production` or `development`) | `production` |
| `ADMIN_EMAIL` | Chief Administrator Google Account | `r96662010@gmail.com` |
| `SESSION_SECRET` | Secret key used for signing SHA-256 HMAC session tokens | Auto-generated random hex |
| `VITE_GOOGLE_CLIENT_ID` | Optional Google Identity Services Client ID | Default demo client ID |
