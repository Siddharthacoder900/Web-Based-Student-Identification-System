# Web-Based Student Identification System

**Bansal Institute of Engineering and Technology, Lucknow**

The Web-Based Student Identification System is a BIET administration portal for student records, digital identification, QR scanning, and verification. Its existing React + Vite frontend and Express API are retained. User accounts, invitations, and password reset tokens are stored in MongoDB.

## Requirements

- Node.js 18 or newer
- MongoDB Atlas (required for real accounts, invitations, and password reset; optional for the development demo)
- A Resend account and verified sender address to deliver password-reset emails

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Copy `.env.example` to `.env`. For local development without MongoDB, set `JWT_SECRET` to a randomly generated value of at least 32 characters. For example:

   ```powershell
   Copy-Item .env.example .env
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Put the generated value in `.env`. The example enables a development-only, in-memory demo administrator:

   - `DEMO_AUTH_ENABLED=true`
   - `DEMO_ADMIN_EMAIL=admin@biet.ac.in`
   - `DEMO_ADMIN_PASSWORD=BietDemo@2026`

   This provider is enabled only when `NODE_ENV=development`. When MongoDB is available, the app provisions the demo account in the existing `User` model and authenticates against MongoDB. Only when MongoDB is unavailable does the isolated demo provider validate against a bcrypt hash held in server memory. It does not accept credentials for other accounts or claim database authentication.

3. To enable MongoDB-backed accounts, set `MONGODB_URI` to the MongoDB Atlas connection string. Configure `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` with an initial authorized administrator's credentials. The password must be at least 12 characters and include uppercase, lowercase, and numeric characters. The account is created only when the database has no administrator. Remove the bootstrap password from `.env` after the account is provisioned. Set `OFFICIAL_EMAIL_DOMAINS` to the allowed email domains; it defaults to `biet.ac.in`.

4. Set `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_BASE_URL` to enable password reset. Without these values, reset requests return a setup error and no email is reported as sent.

5. Start the frontend and API:

   ```powershell
   npm.cmd run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173). The API health check is [http://localhost:5001/api/health](http://localhost:5001/api/health).

The demo credentials are **admin@biet.ac.in / BietDemo@2026** when the example development configuration is enabled. The frontend proxies `/api` requests to `http://localhost:5001` by default (or the `PORT` specified in `.env`); override this with `API_PROXY_TARGET` if necessary. Keep the development terminal open while using the app. In production, explicitly set `NODE_ENV=production` and `DEMO_AUTH_ENABLED=false`; demo authentication is rejected outside development. Serve the Vite build from Express or use same-site frontend/API origins listed in `CORS_ORIGINS`. Production cookies require HTTPS.

## Restricted administrator registration

Public registration is not enabled. Sign in as an administrator and create an invitation in **Settings → Invite an administrator**. The authenticated `POST /api/auth/invitations` API returns a single-use invitation code that expires after 24 hours; share it only with that invited official. The invitee enters the code at `/signup`. The server validates the invitation and assigns the administrator role; clients cannot choose roles.

The invitation endpoint accepts only domains listed in `OFFICIAL_EMAIL_DOMAINS`. Login, registration, invitation creation, and password-reset endpoints have per-process IP-based rate limits.

## Authentication and password reset

Successful sign-in and authorized registration set an HTTP-only, same-site session cookie. Session cookies are secure in production. Password reset tokens are randomly generated, stored only as hashes, expire after 30 minutes, and are single-use. The email endpoint returns the same message whether or not an account exists.

Password reset delivery uses the Resend API. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_BASE_URL`; use a verified sender address and an HTTPS base URL in production.

## Build and tests

```powershell
npm.cmd run build
```

There is currently no automated backend test script in `package.json`. Authentication integration tests require a reachable MongoDB instance and, for delivery tests, a configured email provider. Student records continue to use the project's existing in-memory store.
