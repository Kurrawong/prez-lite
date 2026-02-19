---
title: GitHub OAuth Setup Guide
status: in-progress
updated: 2026-02-10
---

# GitHub OAuth Setup Guide

> Enable inline TTL editing from the prez-lite UI via GitHub OAuth.

## Architecture

```
Browser → GitHub OAuth → Cloudflare Worker (token exchange) → redirect back with token
Browser → GitHub Contents API (read/write files using token)
```

Three things need configuring, in this order:
1. A **Cloudflare Worker** (proxies the token exchange — GitHub's endpoint lacks CORS)
2. A **GitHub App** (provides OAuth credentials with per-repo permissions)
3. **Environment variables** on each prez-lite deployment

One Worker serves all prez-lite instances. The GitHub App is installed per-repo.

Do the steps in order — Step 1 deploys the Worker (no secrets needed yet) so you have the URL, then Step 2 creates the GitHub App using that URL for the callback.

---

## Step 1: Deploy the Cloudflare Worker (~5 min)

### 1a. Create a Cloudflare account and log in

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free tier is fine)
2. From the repo root, install dependencies and authenticate:

```bash
cd packages/github-auth-worker
pnpm install
npx wrangler login          # opens browser to authorize CLI
```

### 1b. Update allowed origins

Edit `packages/github-auth-worker/wrangler.toml` and set `ALLOWED_ORIGINS` to a comma-separated list of your site URLs:

```toml
[vars]
ALLOWED_ORIGINS = "https://vocabs.example.com,http://localhost:3000"
```

### 1c. Deploy and note the URL

The Worker doesn't need secrets to deploy — it just won't handle OAuth until they're set in Step 2.

```bash
npx wrangler deploy
```

The output will print your Worker URL, e.g.:

```
Published prez-lite-auth (https://prez-lite-auth.xxx.workers.dev)
```

Copy this URL — you'll use it as the callback URL when creating the GitHub App next.

### 1d. Verify

```bash
curl https://prez-lite-auth.xxx.workers.dev/health
# Should return: ok
```

---

## Step 2: Create a GitHub App (~5 min)

Now that you have the Worker URL, you can fill in all the GitHub App fields.

1. Go to **GitHub Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App**
2. Fill in:
   - **App name**: `prez-lite-editor` (or similar)
   - **Homepage URL**: your prez-lite site URL
   - **Callback URL**: `https://prez-lite-auth.<your-subdomain>.workers.dev/callback`
   - **Webhook**: uncheck "Active" (not needed)
3. Under **Permissions** > **Repository permissions**:
   - **Contents**: Read & Write
   - Leave everything else as "No access"
4. Under **Where can this GitHub App be installed?**: choose "Only on this account" (or "Any account" if others will use it)
5. Click **Create GitHub App**
6. On the app's settings page, note the **Client ID**
7. Click **Generate a new client secret** and save the **Client Secret** securely

### Install the App on your repo(s)

1. From the GitHub App settings page, click **Install App** in the sidebar
2. Select your account
3. Choose "Only select repositories" and pick the repo(s) containing your vocabularies
4. Click **Install**

### Set the secrets on the Worker

Now go back to the Worker and store the GitHub App credentials:

```bash
cd packages/github-auth-worker
npx wrangler secret put GITHUB_CLIENT_ID
# Paste the Client ID from above

npx wrangler secret put GITHUB_CLIENT_SECRET
# Paste the Client Secret from above
```

---

## Step 3: Configure prez-lite (~2 min)

Set two environment variables for your prez-lite deployment:

| Variable | Value | Example |
|----------|-------|---------|
| `NUXT_PUBLIC_GITHUB_CLIENT_ID` | Client ID from the GitHub App | `Iv1.abc123def456` |
| `NUXT_PUBLIC_GITHUB_AUTH_WORKER_URL` | Worker URL (no trailing slash) | `https://prez-lite-auth.example.workers.dev` |

### Local development

```bash
NUXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.abc123 \
NUXT_PUBLIC_GITHUB_AUTH_WORKER_URL=https://prez-lite-auth.example.workers.dev \
pnpm dev
```

### AWS deployment (GitHub Actions)

Add these as **repository variables** (not secrets) in your GitHub repo settings:

| Variable | Value |
|----------|-------|
| `GH_CLIENT_ID` | Your GitHub App Client ID |
| `GH_AUTH_WORKER_URL` | Your Worker URL |

These are referenced in `.github/workflows/deploy-aws.yml` as:
```yaml
NUXT_PUBLIC_GITHUB_CLIENT_ID: ${{ vars.GH_CLIENT_ID }}
NUXT_PUBLIC_GITHUB_AUTH_WORKER_URL: ${{ vars.GH_AUTH_WORKER_URL }}
```

### Other deployment targets

Set the two `NUXT_PUBLIC_*` env vars in whatever build environment you use (Netlify, Cloudflare Pages, etc.).

---

## Feature Gating

If neither env var is set (the default), the entire auth feature is invisible:
- No "Sign in" button in the header
- No editor section on the share page
- The "Edit on GitHub" link to github.dev still works as before

---

## Verification Checklist

- [ ] GitHub App created with Contents Read & Write permission
- [ ] App installed on target repo(s)
- [ ] Worker deployed with secrets set
- [ ] `ALLOWED_ORIGINS` includes your site URL(s)
- [ ] GitHub App callback URL matches `WORKER_URL/callback`
- [ ] `NUXT_PUBLIC_GITHUB_CLIENT_ID` set in build env
- [ ] `NUXT_PUBLIC_GITHUB_AUTH_WORKER_URL` set in build env
- [ ] "Sign in" button visible in header
- [ ] OAuth flow completes (login → GitHub → redirect back → avatar shown)
- [ ] Editor loads file on share/[vocab] page
- [ ] Save commits to GitHub

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| No "Sign in" button | Env vars not set or empty |
| OAuth redirects to error page | Callback URL mismatch in GitHub App settings |
| "Origin not allowed" error | Site origin not in `ALLOWED_ORIGINS` in `wrangler.toml` |
| Token exchange fails (502) | Wrong `GITHUB_CLIENT_SECRET` in Worker secrets |
| "File not found" in editor | `githubVocabPath` doesn't match actual repo path |
| Save fails with 404 | GitHub App not installed on the repo, or wrong permissions |
| Save fails with 409 | File was modified externally (sha mismatch) — reload and retry |
