const crypto = require('crypto');
const NodeCache = require('node-cache');

// Preview vive sólo en memoria del proceso (el app corre como instancia única,
// ver docker-compose.yml) — no requiere tabla nueva en la BD. Si en el futuro
// se corre en réplicas, esto necesita moverse a un store compartido (Redis).
const store = new NodeCache({ stdTTL: 30 * 60, checkperiod: 60 });

function savePreview(data) {
  const uploadId = crypto.randomUUID();
  store.set(uploadId, data);
  return uploadId;
}

function getPreview(uploadId) {
  return store.get(uploadId) || null;
}

function discardPreview(uploadId) {
  store.del(uploadId);
}

module.exports = { savePreview, getPreview, discardPreview };
