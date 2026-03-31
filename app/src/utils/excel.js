// Utilidades para Excel (xlsx) – generación en buffer y streaming
// Reemplaza la generación CSV en todas las rutas de exportación

const ExcelJS = require('exceljs')

// Estilo de cabecera compartido
const HEADER_FONT  = { bold: true, color: { argb: 'FF1F3864' } }
const HEADER_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
const HEADER_ALIGN = { horizontal: 'center' }

/**
 * Aplica estilo de cabecera a una fila de ExcelJS.
 * @param {ExcelJS.Row} row
 */
function styleHeaderRow(row) {
  row.eachCell(cell => {
    cell.font      = HEADER_FONT
    cell.fill      = HEADER_FILL
    cell.alignment = HEADER_ALIGN
  })
}

/**
 * Genera un Buffer xlsx a partir de arrays de rows y columns.
 * @param {Object[]} rows    - Filas: array de objetos { col: value }
 * @param {string[]} columns - Nombres de columna (también keys en rows)
 * @returns {Promise<Buffer>}
 */
async function toExcelBuffer(rows, columns) {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'DotacionRRHH'
  wb.created  = new Date()
  const ws = wb.addWorksheet('Datos')

  // Cabecera
  const headerRow = ws.addRow(columns)
  styleHeaderRow(headerRow)

  // Datos
  for (const row of rows) {
    ws.addRow(columns.map(k => row[k] ?? ''))
  }

  // Auto-ancho de columnas (máx 60 chars)
  ws.columns.forEach((col, i) => {
    let max = String(columns[i] || '').length
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value != null ? String(cell.value).length : 0
      if (len > max) max = len
    })
    col.width = Math.min(60, max + 2)
  })

  return wb.xlsx.writeBuffer()
}

/**
 * Devuelve el buffer xlsx codificado en base64.
 * @param {Object[]} rows
 * @param {string[]} columns
 * @returns {Promise<string>}
 */
async function toExcelBase64(rows, columns) {
  const buf = await toExcelBuffer(rows, columns)
  return buf.toString('base64')
}

/**
 * Genera un xlsx para minutas con columnas dinámicas (id + name).
 * @param {Array<{id: string, name: string}>} colDefs
 * @param {Object[]} rows   - Array de { [colId]: value }
 * @param {string}   titulo - Nombre de la hoja
 * @returns {Promise<Buffer>}
 */
async function toMinutaExcelBuffer(colDefs, rows, titulo) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'DotacionRRHH'
  wb.created = new Date()

  // El nombre de la hoja no puede superar 31 caracteres en Excel
  const sheetName = (titulo || 'Minuta').substring(0, 31)
  const ws = wb.addWorksheet(sheetName)

  // Cabecera
  const headerRow = ws.addRow(colDefs.map(c => c.name))
  styleHeaderRow(headerRow)

  // Datos
  for (const row of rows) {
    ws.addRow(colDefs.map(c => row[c.id] ?? ''))
  }

  // Auto-ancho
  ws.columns.forEach((col, i) => {
    let max = String(colDefs[i]?.name || '').length
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value != null ? String(cell.value).length : 0
      if (len > max) max = len
    })
    col.width = Math.min(60, max + 2)
  })

  return wb.xlsx.writeBuffer()
}

/**
 * Escribe un xlsx directamente al response de Express usando streaming.
 * Adecuado para grandes volúmenes de datos (miles de filas).
 *
 * @param {Object}   opts
 * @param {Response} opts.res        - Express response (writable stream)
 * @param {string}   opts.filename   - Nombre del archivo (.xlsx)
 * @param {string[]} opts.columns    - Nombres de columna / keys en rows
 * @param {Function} opts.fetchBatch - async (offset, batchSize) => rows[]
 * @param {number}   [opts.batchSize=3000]
 */
async function streamExcelResponse({ res, filename, columns, fetchBatch, batchSize = 3000 }) {
  const safeFilename = filename.replace(/[^\w\-_.()áéíóúÁÉÍÓÚñÑ ]/g, '_')

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`)
  res.setHeader('Cache-Control', 'no-store')

  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res })
  const ws = wb.addWorksheet('Datos')

  // Cabecera
  const headerRow = ws.addRow(columns)
  headerRow.font  = HEADER_FONT
  headerRow.fill  = HEADER_FILL
  headerRow.commit()

  let offset = 0
  while (true) {
    const chunk = await fetchBatch(offset, batchSize)
    if (!chunk || !chunk.length) break
    for (const row of chunk) {
      const r = ws.addRow(columns.map(k => row[k] ?? ''))
      r.commit()
    }
    offset += chunk.length
    if (chunk.length < batchSize) break
    if (res.writableEnded || res.destroyed) break
  }

  await ws.commit()
  await wb.commit()
}

module.exports = { toExcelBuffer, toExcelBase64, toMinutaExcelBuffer, streamExcelResponse }
