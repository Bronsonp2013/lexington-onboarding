# Ingestion endpoint (Google Apps Script)

Runs inside Bronson's Google account (bronsonprachyl@gmail.com). Each submission from the
site becomes: a row in the **Lexington New Accounts** sheet (plus Contacts, Locations,
Suppliers rows), a Drive folder with every PDF, an email to BPrachyl@lexington.com with
the zipped packet, a Google Task, and a queue entry for Pathfinder.

## Deploy once (about five minutes)

1. Go to https://script.google.com → **New project**. Name it `Lexington New Accounts`.
2. Replace the contents of `Code.gs` with this folder's `Code.gs`.
3. Project settings (gear) → tick **Show "appsscript.json" manifest file** → open it and
   replace its contents with this folder's `appsscript.json`. (This enables the Tasks
   service and declares the web-app access.)
4. In the editor, choose the function **`setup`** and press **Run**. Approve the permissions
   (Sheets, Drive, Gmail, Tasks). It creates the sheet, the Drive root folder, the task list,
   the edit trigger, and a rep token. Open **Executions** or **View → Logs** and copy:
   - the sheet URL,
   - the `REP_TOKEN` (paste into rep tools → Your details).
5. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone**.
   Copy the `/exec` URL.
6. Send me the `/exec` URL. It becomes the site's `VITE_INGEST_URL` repository variable;
   the next deploy makes the live form use it.

Test from the editor any time: run **`test_submit`**. It posts a fictional application
twice and should leave one row, one Drive folder, and one email.

## Updating the script

Paste the new `Code.gs`, then **Deploy → Manage deployments → Edit → Version: New**.
The `/exec` URL does not change.

## Rep actions

`list`, `get`, and `status` require the `REP_TOKEN`. Rep tools use them for the inbox,
stage changes, and account numbers. Editing **Status** or **Account number** directly in
the sheet triggers the same workflow (follow-up task, welcome draft). Nothing is ever sent
automatically; the welcome email is a Gmail draft.

## Data and privacy

Tax IDs, FEINs, and signatures live in this Google account only. Do not share the sheet
or the Drive folder publicly.
