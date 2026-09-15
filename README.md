# Lexington New Account Application

Customer-facing onboarding packet for Bronson Prachyl's Lexington Home Brands territory (838.01).
A prospect answers one branded application; the app completes every official Lexington form in the
browser, zips them with the customer's uploaded certificate, and emails the packet to Bronson.

Built on the Lexington Home Brands design system (`src/styles/lhb-tokens.css` is a copy of the
design-system token file in `03_RepTech/_skills/lexington-home-brands-design`).

## What the customer gets

| Step | Covers |
|---|---|
| Welcome | Business type (designer / decorator / retailer / outdoor / hospitality / model home / internet) → chooses the designer or retail path |
| Company | Legal entity, address, phone, email, acknowledgement method; retail adds type of business, date started, fiscal year end, annual sales, D&B, Lyons |
| Contacts | Designer: applicant/owner. Retail: owner, president, AP manager, buyer, Extranet administrator |
| Billing & Marketing | Bill-to and Marketing/UPS addresses ("same as business" by default) |
| Ship-To Locations | Repeater: address, hours, per-day delivery hours or closed, holidays, distribution center; ship complete vs partial |
| Freight | Prepaid Freight Program (rates, fixed values, calculator, claim guidelines, agreement) or preferred carrier |
| Tax Exemption | E-595E answers plus required upload of the state certificate; optional multistate page |
| Credit References | Retail only: major suppliers, financial statement upload, net-30 terms |
| Review & Sign | Summary, sales policy acknowledgement, certification, drawn signature |

## What Bronson receives

One zip (`LHB-New-Account-<Company>-<date>.zip`) attached to the Web3Forms email, plus the JSON in the email body:

- `00 Application Summary` — branded one-document summary of every answer (for records / CRM)
- `01 Interior Designer Credit Application` (LR022817) **or** `01 Credit Application` (LR062917 layout)
- `02 E-595E Certificate of Exemption` — pages 1–2 filled and signed
- `03 Prepaid Freight Program Agreement` (LR123125) — only when the customer opts in; page 2 filled and signed
- `04 Credit Card Transaction Form` (designer path) — identity fields only; **card numbers are never collected**
- `Attachment - Tax Certificate - …` and, for retail, `Attachment - Financial Statement - …`
- `submission.json` — the full data record (includes the signature image)

Extra ship-to locations are appended to the credit application as an "Additional Ship-To Locations" page.

## Rep tools (local only)

`rep.html` opens the emailed zip or JSON, rebuilds the packet with the IAM number and account number
stamped in, fills the rep-only **New Account Checklist** (LR041624) with suggested class and pricing
tiers, and drafts the email to newaccount@lexington.com.

The customer build (`npm run build` → `dist/`) never includes `rep.html` or `rep-forms/`. Only
`npm run build:rep` (→ `dist-rep/`) does. Do not deploy `dist-rep/`.

## Running

```bash
npm install
npm run dev            # http://localhost:5173  (add #demo or #demo-retail for sample data)
npm run build          # customer site → dist/
npm run build:rep      # rep tools → dist-rep/ (do not publish)
npm run bundle:rep     # rep tools → nas_deploy/ for the NAS
npm run fields         # dump AcroForm field names of every template to src/lib/pdf/fields.md
node scripts/test-packet.mjs <dir>     # build both sample packets in Node for inspection
node scripts/test-checklist.mjs <dir>  # fill the rep checklist for both samples
node scripts/render.mjs <pdf> <prefix> [pages]  # render pages to PNG with MuPDF
```

Windows note: `node_modules` is a junction to `C:\dev\lexington-onboarding\node_modules` so it stays out of OneDrive.

## Configuration

Copy `.env.example` to `.env`:

- `VITE_WEB3FORMS_KEY` — access key from https://web3forms.com created with the receiving address (BPrachyl@lexington.com). Without it the app runs in download-only mode and tells the customer to email the zip.
- `VITE_SALES_POLICY_URL` — link to the LHB Sales Policy shown on the review step.
- `VITE_CAPTCHA=on` — adds hCaptcha to the submit step (supported on the Web3Forms free plan).

Free-plan limits that shaped the design: one attachment per submission, 5 MB max. Uploads are capped at 3 MB; the filled PDFs total roughly 750 KB.

## Where it runs

| What | URL |
|---|---|
| Customer application | https://bronsonp2013.github.io/lexington-onboarding/ |
| Corporate demo (sample data, nothing sent) | https://bronsonp2013.github.io/lexington-onboarding/#demo · `#demo-retail` · add `/<step>` to open a step, e.g. `#demo/freight` |
| Rep tools (NAS, Tailscale only) | http://ugreen-nas:8634/rep.html |
| Repo | https://github.com/Bronsonp2013/lexington-onboarding |

## Deploying

**Customer site.** Every push to `main` runs `.github/workflows/deploy.yml`: it builds with `VITE_BASE=/lexington-onboarding/`, guards that no rep-only file is in `dist`, and publishes to GitHub Pages. Secrets and variables live on the repo:

```bash
gh secret set VITE_WEB3FORMS_KEY --repo Bronsonp2013/lexington-onboarding      # email delivery
gh variable set VITE_SALES_POLICY_URL --repo Bronsonp2013/lexington-onboarding --body "https://…"
gh variable set VITE_CAPTCHA --repo Bronsonp2013/lexington-onboarding --body on   # optional hCaptcha
gh workflow run deploy.yml --repo Bronsonp2013/lexington-onboarding              # redeploy after changing them
```

**Rep tools.** `npm run bundle:rep` fills `nas_deploy/`; copy it to the NAS as described in `nas_deploy/README_NAS_SETUP.md`. The rep checklist template is git-ignored on purpose and travels only in that bundle.

## Templates

`public/forms/` holds the blank Lexington PDFs used as fill templates. `e595e.pdf` was re-saved through MuPDF because the original web-fill file has a broken cross-reference table that pdf-lib cannot read; the content is unchanged. `credit-application.pdf` is currently the Artistica-branded LR062917 form; replace it with the Lexington-branded blank when available (same field names).

## Still needed from Bronson

1. Web3Forms access key.
2. Lexington-branded retailer Credit Application PDF (blank).
3. LHB Sales Policy link or PDF.
4. IAM number (entered once in rep tools).
5. A hosting account, or hand-off of `dist/`.
