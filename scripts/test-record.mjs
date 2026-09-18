// Checks the CustomerRecord contract for both sample paths: required Pathfinder-mapped
// fields present, one primary contact with an email, sheet row keys match the header.
const { sampleDesigner, sampleRetail } = await import("../src/data/sample.js");
const { toCustomerRecord, toApplicationRow, APPLICATION_COLUMNS } = await import("../src/lib/crmRecord.js");
const { readFileSync } = await import("node:fs");

const gas = readFileSync("gas/Code.gs", "utf8");
const m = gas.match(/const APPLICATION_COLUMNS = \[([\s\S]*?)\];/);
const gasCols = m[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""));
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log("FAIL", msg); } else console.log("ok  ", msg); };

check(JSON.stringify(gasCols) === JSON.stringify(APPLICATION_COLUMNS), `sheet header matches gas/Code.gs (${APPLICATION_COLUMNS.length} columns)`);

for (const [kind, make] of [["designer", sampleDesigner], ["retail", sampleRetail]]) {
  const d = make(); d.meta.id = "LHB-TEST-" + kind.toUpperCase(); d.meta.submitted_at = new Date().toISOString();
  const r = toCustomerRecord(d, { fileNames: ["a.pdf"] });
  check(r.record_version === 1 && r.application_id && r.submitted_at, `${kind}: version/id/submitted_at`);
  check(["designer", "decorator", "retail", "design_build", "other"].includes(r.account.account_type), `${kind}: account_type '${r.account.account_type}' is a Pathfinder value`);
  check(r.account.name && r.account.address_line1 && r.account.city && r.account.state && r.account.zip, `${kind}: account name + address`);
  const primaries = r.contacts.filter((c) => c.is_primary);
  check(primaries.length === 1 && primaries[0].email && primaries[0].first_name, `${kind}: exactly one primary contact with email (${primaries[0]?.email})`);
  check(r.locations[0].kind === "business" && r.locations[0].is_primary, `${kind}: business address is the primary location`);
  check(r.locations.filter((l) => l.kind === "ship_to").length === d.ship_to.length, `${kind}: ${d.ship_to.length} ship-to location(s)`);
  check(r.onboarding.tax_permit_number && r.onboarding.signed_by, `${kind}: onboarding tax + signer`);
  const row = toApplicationRow(r);
  check(JSON.stringify(Object.keys(row)) === JSON.stringify(APPLICATION_COLUMNS), `${kind}: row keys match header order`);
  check(kind !== "retail" || r.onboarding.suppliers.length >= 3, `${kind}: suppliers carried`);
}
console.log(fail ? `\n${fail} check(s) failed` : "\nall checks passed");
process.exit(fail ? 1 : 0);
