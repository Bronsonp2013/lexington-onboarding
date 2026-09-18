// Deployment configuration.
// ingestUrl: the Google Apps Script web-app /exec URL (see gas/README.md). Set
// VITE_INGEST_URL as a GitHub repository variable or in .env. Leave empty to run in
// download-only mode (the customer downloads the packet and emails it).
export const CONFIG = {
  ingestUrl: import.meta.env.VITE_INGEST_URL || "",
  // Link to the LHB Sales Policy shown on the review step. Leave empty until supplied.
  salesPolicyUrl: import.meta.env.VITE_SALES_POLICY_URL || "",
};
