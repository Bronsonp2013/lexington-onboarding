# Rep Tools on the UGREEN DXP4800

Goal: the rep-only tools (open a customer packet, rebuild forms, fill the New Account
Checklist, draft the Lexington email) run on the NAS and you open them from any device
on your Tailscale network. Nothing here is public; the customer site lives on GitHub Pages.

If the Field Report Manager or the LHB Field App is already on the NAS, Docker and
Tailscale are done — only Step 1 and Step 2 are new.

## Step 0 — Build the bundle (on the PC)

In `03_RepTech\lexington-onboarding`:

```bash
npm run bundle:rep
```

That fills this `nas_deploy/` folder with `docker-compose.yml` and `app/`.
`app/rep-forms/new-account-checklist.pdf` is included on purpose; it is ignored by git.

## Step 1 — Create the folder on the NAS

UGOS Pro → **Files** → on the main volume create:

```
docker/lexington-onboarding-rep/
```

Copy the whole contents of `nas_deploy/` into it (SMB share or the Files upload):
`docker-compose.yml` and the `app/` folder.

## Step 2 — Start it

UGOS Docker → **Compose / Project** → create a project from that folder → **Up**.
Over SSH instead: `cd /volume1/docker/lexington-onboarding-rep && docker compose up -d`

Test on the home network: `http://<NAS-IP>:8634/rep.html`

## Step 3 — Use it from the field

With Tailscale on (phone or laptop): `http://ugreen-nas:8634/rep.html`
(or `http://100.x.y.z:8634/rep.html` with the NAS's Tailscale IP). Add it to the
phone home screen.

First time on each device: open **Your details** in the left column and enter the IAM
number; it is remembered in that browser and stamped on regenerated forms.

## Updating

Rebuild on the PC (`npm run bundle:rep`), replace the `app/` folder on the NAS, then
in UGOS Docker restart the project (or `docker compose restart`). No data lives in the
container, so replacing `app/` is safe at any time.

## Routine

1. Application email arrives with the zip attached.
2. Save the zip; open `http://ugreen-nas:8634/rep.html`; **Open a submission** → the zip.
3. Confirm customer class and pricing tiers; **Download checklist**.
4. **Draft email to newaccount@lexington.com**; attach the checklist and the forms from the zip.
5. When Lexington returns the account number, enter it and **Rebuild customer packet** if
   any form needs the number on it (freight agreement, card form).
