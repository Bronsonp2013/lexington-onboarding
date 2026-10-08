# CustomerRecord v1

The one record every downstream system reads. Produced in the browser by
`src/lib/crmRecord.js` → `toCustomerRecord(submission)` and sent with each submission.
The raw `submission.json` travels alongside it for regenerating the Lexington forms;
systems should consume the record, not the raw submission.

## Top level

| Field | Type | Notes |
|---|---|---|
| `record_version` | 1 | bump on breaking changes |
| `application_id` | `LHB-YYYYMM-xxxxxx` | unique per submission; upsert key |
| `submitted_at` | ISO datetime | |
| `demo` | boolean | demo submissions never reach the endpoint |
| `status` | stage key | `application_received` → `packet_reviewed` → `sent_to_lexington` → `account_number_assigned` → `welcome_sent` → `first_order` |
| `account_number` | string | Lexington customer number, empty until assigned. Maps to Pathfinder `accounts.external_id` |
| `pathfinder_sync` | `pending` \| `imported` \| `skipped` | set by the Pathfinder importer |
| `drive_folder_url` | URL | filled by the Apps Script after filing the PDFs |

## `account` → Pathfinder `accounts`

| Field | Pathfinder column | Notes |
|---|---|---|
| `name` | `name` | legal company name |
| `dba` | — | keep in notes/tags |
| `account_type` | `account_type` | `designer`, `decorator`, `retail` (retailer, outdoor, internet), `design_build` (hospitality, model home), `other` |
| `business_type`, `business_type_label` | — | the applicant's own choice |
| `lexington_class`, `pricing_tier_suggested` | — | rep checklist suggestions (Designer / Decorator / Wholesale) |
| `address_line1/2, city, state, zip, country` | same | business address (also `locations[0]`) |
| `county, phone, fax, email, website, ack_method` | — | |
| `entity_type` | — | Sole Proprietorship / Partnership / Corporation / LLC / Sub-S |
| retail only: `type_of_business, date_started, fiscal_year_end, est_annual_sales, dnb, parent_dnb, lyons` | — | |

## `contacts[]` → Pathfinder `contacts`

`{ role, first_name, last_name, title, email, phone, is_primary }`. Roles: `applicant` (designer path) or `owner`, `president`, `ap_manager`, `buyer`, `extranet_admin` (retail path). Exactly one `is_primary`; its `email` falls back to the company email so outreach always has an address.

## `locations[]` → Pathfinder `account_locations`

`{ label, kind, address_line1, address_line2, city, state, postal_code, country, is_primary, attention, phone, is_dc, hours, days, holidays }`.
`kind`: `business` (first, `is_primary`), `ship_to` (one per delivery location), `bill_to`, `marketing` (only when different from the business address). Pathfinder should import `business` + `ship_to` as locations; `bill_to`/`marketing` are informational.

## `onboarding` (no Pathfinder home yet; suggested `account_onboarding` table)

Carrier election and freight state/rate, partial-ship preference, tax state, permit number, FEIN, exemption reason, certificate file name, additional states, suppliers (retail), financial statement file name, terms and sales-policy acknowledgements, signer name/title/date, packet file names.

## `source`

`{ app, url, user_agent, rep }`.

## Applications sheet columns

The Apps Script flattens the record to one row with `flattenRecord_`, which mirrors `toApplicationRow(record)` in `src/lib/crmRecord.js`; the header order is `APPLICATION_COLUMNS` and must match in both files. The browser no longer sends a row of its own. The full record is also stored in the row's `record_json` column, and the submission in `submission_json` without the signature image (a drawn signature is larger than the 50,000-character cell limit). The complete submission, signature included, is `submission.json` in the application's Drive folder, and the rep `get` action reads it from there.

Every text value is written as plain text, so ZIP codes, phone numbers and account numbers keep their exact characters and nothing an applicant types can run as a formula.

**Server-owned columns.** A submit never takes these from the browser: `status`, `account_number`, `pathfinder_sync`, `drive_folder_url`, `demo`, `received_at`, `pathfinder_account_id`, `notes`, `submit_key_hash`, `notified_at`. Only the script and the rep tools (with the rep token) change them.

**Resubmits.** The browser creates a random key with each application and sends it beside the record, never inside it. The script stores its SHA-256 in `submit_key_hash`. A later submit with the same `application_id` is accepted only with the same key and only while the status is still `application_received`; it updates the row and files, sends an email marked "Updated", and creates no second task. `notified_at` records when the first packet email went out.
