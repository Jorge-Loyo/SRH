// Utilidades para CSV (escape, generación base64 y streaming)

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function toCsv(rows, columns) {
  const header = columns.join(',')
  const lines = rows.map(r => columns.map(k => escapeCsvValue(r[k])).join(','))
  return [header, ...lines].join('\n')
}

function toCsvBase64(rows, columns) {
  const csv = toCsv(rows, columns)
  return Buffer.from(csv, 'utf8').toString('base64')
}

module.exports = { escapeCsvValue, toCsv, toCsvBase64 }
