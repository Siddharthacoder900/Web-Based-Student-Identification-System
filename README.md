# BIET Student Identification System

BIET's existing React/Vite application with an Express/Mongoose API for administrator authentication, student records, identity cards, and QR verification.

## Requirements

- Node.js 20 or newer
- MongoDB (local or hosted)

## Local setup

1. Install dependencies from PowerShell:
   ```powershell
   Set-Location "C:\Users\siddh\Desktop\biet_student_identification_frontend"
   npm.cmd install
   ```
2. Create a MongoDB Atlas cluster and database user (instructions below).
3. Run the initial administrator setup wizard:
   ```powershell
   Set-Location "C:\Users\siddh\Desktop\biet_student_identification_frontend"
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\setup-admin.ps1"
   ```
   The wizard masks the MongoDB URI and administrator password, generates a random 48-byte JWT secret without displaying it, writes a Git-ignored `.env`, and calls the existing `npm.cmd run create-admin` bootstrap. It reuses (and never overwrites) an existing `.env`. Choose a unique administrator password of at least 12 characters.
   To check the script and project wiring without entering credentials or changing `.env`, append `-ValidateOnly` to that PowerShell command.
4. Start the API and frontend together:
   ```powershell
   npm.cmd run dev
   ```
   The API listens on **port 5001** and Vite serves the frontend on **port 5173**. Vite proxies `/api` requests to `http://localhost:5001`. Alternatively, in separate PowerShell windows run `npm.cmd run dev:server` and `npm.cmd run dev:client -- --port 5173`. `npm.cmd run start:server` starts the API without watch mode.
5. Check the API/database connection:
   ```powershell
   Invoke-RestMethod http://localhost:5001/api/health
   ```
   A working setup reports `status: ok` and `database: connected`. Then open `http://localhost:5173/admin/login` and sign in with the email and password entered into the local wizard.
6. Tests and production build: `npm.cmd test` and `npm.cmd run build`.

The API requires `MONGODB_URI` and a strong `JWT_SECRET`; it does not fall back to in-memory data. MongoDB must be reachable for login and data operations.

### MongoDB Atlas setup

1. Create a MongoDB Atlas cluster and a dedicated database user for this app. Grant `readWrite` on the `biet_student_identity` database only. Do not use your Atlas website sign-in as the database credentials.
2. In **Network Access**, allowlist your current public IP. Avoid `0.0.0.0/0`, which allows connections from anywhere.
3. In **Database → Connect → Drivers**, copy the Node.js connection URI. Replace the username and password placeholders with the database user's credentials and specify a database name such as `biet_student_identity`.
4. Percent-encode reserved characters in the database password (`@`, `:`, `/`, `?`, `#`, etc.) before using it in the URI.
5. Run the setup wizard and paste the URI at its masked prompt. It is saved only in the local, Git-ignored `.env`; never paste the URI into chat or commit/share `.env`.
6. If setup cannot connect, check that the cluster is active, your current IP is allowlisted, database credentials are correct, and reserved password characters are URL-encoded. The wizard keeps the `.env` for retries; edit it locally if the URI needs correction, then rerun the wizard.

### Administrator bootstrap details

`npm.cmd run create-admin` is the existing one-time database setup mechanism. It reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from the process environment, requires at least 12 password characters, bcrypt-hashes the password, and refuses duplicate email addresses. The PowerShell wizard supplies these values to the child process without writing them to `.env`. No default administrator credentials are defined.

For production, serve the built `dist/` files over HTTPS and configure the web server/reverse proxy to route same-origin `/api` requests to the Express API. Set `PUBLIC_APP_URL` to the public frontend origin so issued QR codes resolve to the verification page.

## Routes

- `/` — Public BIET homepage with database-backed aggregate statistics
- `/admin/login` — Administrator sign-in
- `/admin/dashboard` — Database-backed overview
- `/admin/students` — Search, filter, export, and archive student records
- `/admin/students/add` — Register a student and optionally upload a photograph
- `/admin/students/:studentId` — View and edit a student record
- `/admin/id-cards` — Issue or rotate identity cards and download printable PDFs
- `/admin/qr-scanner` — Camera or manual QR verification
- `/admin/verifications` — Verification history
- `/admin/settings` — Signed-in account and API/database health
- `/verify/:token` — Limited public verification result for a QR token

## Security and operations

- Administrator passwords are bcrypt-hashed. Admin sessions use expiring, HTTP-only cookies; login attempts are rate-limited.
- There is no public administrator registration or built-in demo password. Use the one-time setup command to create the first administrator.
- JPEG/PNG student photographs are size- and file-signature-validated, stored outside the public web root, and served only to authenticated administrators.
- QR codes contain a cryptographically random verification URL. MongoDB stores only the token hash; verification logs never include the token. Public verification discloses only limited identity details.
- Student removal is a soft archive. Archiving revokes active ID cards rather than deleting the student history.
- Add the college-provided, unmodified logo at `public/assets/biet-logo.jpg`. The repository does not currently contain the official image; the existing brand component uses its text fallback until the original asset is supplied.
- Student data and credentials are sensitive. Use a protected MongoDB deployment, TLS, backups, access controls, and institution-approved privacy/retention policies before production use.
