# NEVHub — Student Activities Portal

Starter repository for **NEVHub**, a responsive student portal for Open Lab, Bootcamp, and Open Recruitment. Uses HTML/CSS/JavaScript for the separate student/admin frontends and Google Apps Script + Google Sheets for the backend.

## Repository layout

- `index.html` — student portal: self-registration, NIM/password login, browse events, apply, history and approval letter/WhatsApp link.
- `admin.html` — separate admin portal: create/edit/close events, dynamic requirements, review applications, export CSV, print recaps and view students.
- `Code.gs` — Apps Script API and Google Sheets integration.
- `assets/nev-logo.png` — official NEV logo used in both portals.

## Setup Google Sheets backend

1. Create a Google Spreadsheet, e.g. **NEVHub Database**. Copy the ID from its URL (`/spreadsheets/d/SPREADSHEET_ID/edit`).
2. Open **Extensions → Apps Script** from the spreadsheet, then paste `Code.gs`.
3. In **Project Settings → Script Properties**, add:
   - `SPREADSHEET_ID` = spreadsheet ID
   - `SESSION_SECRET` = long random secret (at least 32 characters)
   - `ADMIN_EMAIL` = admin email address
   - `ADMIN_PASSWORD_HASH` = SHA-256 hex of `admin-password|SESSION_SECRET`
   - Optional `UPLOAD_FOLDER_ID` = private Google Drive folder ID for uploaded proof files
4. To create the admin password hash, run this helper temporarily in Apps Script and inspect Logs, changing the password before running. **Remove this helper after setting the property.**
   ```js
   function generateAdminHashOnce() {
     const secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
     const password = 'CHANGE-THIS-TO-A-STRONG-PASSWORD';
     const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + '|' + secret, Utilities.Charset.UTF_8);
     const hex = bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
     console.log(hex);
   }
   ```
   Copy the log value into `ADMIN_PASSWORD_HASH`, then delete the helper and save.
5. Run `setupDatabase()` once from the Apps Script editor and grant requested permissions (Sheets, Drive, email).
6. **Deploy → New deployment → Web app**. Execute as **Me**. Set access to **Anyone** (or the most restrictive access compatible with your intended users). Copy the `/exec` URL.
7. In both `index.html` and `admin.html`, replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with the deployed `/exec` URL.
8. Test by registering a dummy student, creating an event in `admin.html`, applying, and approving from the admin portal.

## Run locally

Open `index.html` and `admin.html` using a local static server or deploy both files to GitHub Pages. They share the same Apps Script backend URL. GitHub Pages serves static files only; the Apps Script Web App is the backend.

## Dynamic event requirements

In the admin event form, enter one requirement per line:

```text
Bukti foto|file|wajib
Alasan mengikuti|textarea|wajib
Pengalaman sebelumnya|text|opsional
Pilihan divisi|select|wajib|Network,IoT,Software
Jumlah pembayaran|number|opsional
```

Supported types: `text`, `textarea`, `file`, `select`, `number`. File uploads accept images/PDF and are capped at 3 MB by the frontend.

## Suggested GitHub repository

Repository name: `nevhub-student-portal`

```bash
git init
git add .
git commit -m "Initial NEVHub student and admin portal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nevhub-student-portal.git
git push -u origin main
```

Then enable **Settings → Pages → Deploy from a branch → `main` / root**. Keep the Apps Script backend deployed separately.

## Important security and production notes

This is a starter implementation, not a production-audited system. Before opening registration publicly:
- Use a strong random `SESSION_SECRET` and strong admin password. Never commit secrets, spreadsheet IDs, or real student data to GitHub.
- Google Apps Script web apps do not automatically provide a secure user identity just because a user types a Gmail address. Consider adding Google Identity Services / institutional OAuth and verify tokens server-side.
- The example caches sessions for 6 hours. For a production deployment, add rate limiting, stronger session storage/rotation, audit logs, input validation, and CSRF/origin protections appropriate to the chosen hosting setup.
- Drive links for submitted proof files should be restricted to authorized staff. Avoid `ANYONE_WITH_LINK` for sensitive student records; the approval letter is link-accessible in this starter and should be changed to a restricted access model for sensitive use.
- Email sending depends on Apps Script authorization and recipient quotas. Check execution logs if email does not arrive.
- The fee field is informational only; payment verification and payment gateway integration are not implemented.
- Add a proper file review UI and configurable custom field validation before using it for a large cohort.
- Student data is personal data. Limit admin access, publish a privacy notice, define retention/deletion policy, and obtain appropriate consent.
