// Uploaded files survive a page reload via IndexedDB (localStorage cannot hold File objects).
const DB = "lhb-onboarding";
const STORE = "files";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const req = fn(store);
      t.oncomplete = () => resolve(req?.result);
      t.onerror = () => reject(t.error);
    });
  } catch { return undefined; }
}

export const fileStore = {
  put: (key, file) => tx("readwrite", (s) => s.put(file, key)),
  get: (key) => tx("readonly", (s) => s.get(key)),
  remove: (key) => tx("readwrite", (s) => s.delete(key)),
  clear: () => tx("readwrite", (s) => s.clear()),
};
