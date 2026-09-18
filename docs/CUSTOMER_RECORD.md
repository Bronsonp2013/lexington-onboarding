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

`toApplicationRow(record)` flattens the record to one row; the header order is `APPLICATION_COLUMNS` in `src/lib/crmRecord.js` and must match `APPLICATION_COLUMNS` in `gas/Code.gs`. The full record is also stored in the row's `record_json` column, and the raw submission in `submission_json`, so nothing is lost when the flat columns change.
