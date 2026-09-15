// Deployment configuration.
// web3formsKey: create a free key at https://web3forms.com with the address that should
// receive applications (BPrachyl@lexington.com), then either set VITE_WEB3FORMS_KEY in .env
// or paste it here. Leave empty to run in download-only mode.
export const CONFIG = {
  web3formsKey: import.meta.env.VITE_WEB3FORMS_KEY || "",
  // Link to the LHB Sales Policy shown on the review step. Leave empty until supplied.
  salesPolicyUrl: import.meta.env.VITE_SALES_POLICY_URL || "",
  // Turns on hCaptcha on the submit step (Web3Forms free plan supports it).
  captcha: (import.meta.env.VITE_CAPTCHA || "off") === "on",
};
