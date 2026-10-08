// Deployment configuration.
// ingestUrl: the Google Apps Script web-app /exec URL (see gas/README.md). Set
// VITE_INGEST_URL as a GitHub repository variable or in .env. Leave empty to run in
// download-only mode (the customer downloads the packet and emails it).
// (import.meta.env exists only in Vite builds; the Node test scripts see empty values.)
const env = import.meta.env || {};
export const CONFIG = {
  ingestUrl: env.VITE_INGEST_URL || "",
  // Link to the LHB Sales Policy shown on the review step. Until it is supplied, the policy
  // acknowledgement is hidden and not required: nobody can agree to a policy they cannot read.
  salesPolicyUrl: env.VITE_SALES_POLICY_URL || "",
};
