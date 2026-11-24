const { config } = require("./env");

let cachedAuth;

function loadCredentials() {
  const fb = config.firebase;
  if (fb.serviceAccountB64) {
    const j = JSON.parse(Buffer.from(fb.serviceAccountB64, "base64").toString("utf8"));
    return { projectId: j.project_id, clientEmail: j.client_email, privateKey: j.private_key };
  }
  if (fb.projectId && fb.clientEmail && fb.privateKey) {
    return {
      projectId: fb.projectId,
      clientEmail: fb.clientEmail,
      privateKey: fb.privateKey.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

/** Lazily initialised; returns null when Firebase is not configured. */
function getAdminAuth() {
  if (cachedAuth !== undefined) return cachedAuth;
  const creds = loadCredentials();
  if (!creds) {
    cachedAuth = null;
    return cachedAuth;
  }
  const { initializeApp, cert, getApps } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  if (!getApps().length) initializeApp({ credential: cert(creds) });
  cachedAuth = getAuth();
  return cachedAuth;
}

module.exports = { getAdminAuth };
