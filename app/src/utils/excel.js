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
 * Agrega una hoja "Filtros" al workbook con los filtros activos.
 * Soporta tanto Workbook normal como WorkbookWriter (streaming).
 * @param {object} wb        - Instancia de Workbook o WorkbookWriter
 * @param {Object} filters   - { "Etiqueta": "valor", ... }
 * @param {boolean} streaming
 */
async function _addFiltersSheet(wb, filters, streaming = false) {
  if (!filters) return
  const entries = Object.entries(filters).filter(([, v]) =>
    v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
  )
  if (entries.length === 0) return

  const ws = wb.addWorksheet('Filtros')

  // Anchos de columna (deben definirse antes de filas en streaming)
  ws.getColumn(1).width = 32
  ws.getColumn(2).width = 55

  // Fila de título
  const titleRow = ws.addRow(['Filtros aplicados al exportar', ''])
  titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
  if (streaming) titleRow.commit()

  // Fila de cabecera de columnas
  const headerRow = ws.addRow(['Filtro', 'Valor'])
  styleHeaderRow(headerRow)
  if (streaming) headerRow.commit()

  // Filas de datos
  for (const [k, v] of entries) {
    const val = Array.isArray(v) ? v.join(', ') : String(v ?? '')
    const r = ws.addRow([k, val])
    if (streaming) r.commit()
  }

  if (streaming) await ws.commit()
}

/**
 * Genera un Buffer xlsx a partir de arrays de rows y columns.
 * @param {Object[]} rows    - Filas: array de objetos { col: value }
 * @param {string[]} columns - Nombres de columna (también keys en rows)
 * @param {Object}   [opts]  - Opciones opcionales
 * @param {Object}   [opts.filters] - Filtros activos { "Etiqueta": "valor" }
 * @returns {Promise<Buffer>}
 */
async function toExcelBuffer(rows, columns, { filters } = {}) {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'DotacionRRHH'
  wb.created  = new Date()

  // Hoja de filtros primero (si hay)
  await _addFiltersSheet(wb, filters, false)

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
 * @param {Object}   [opts]
 * @param {Object}   [opts.filters]
 * @returns {Promise<string>}
 */
async function toExcelBase64(rows, columns, { filters } = {}) {
  const buf = await toExcelBuffer(rows, columns, { filters })
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
 * @param {Object}   [opts.filters]  - Filtros activos { "Etiqueta": "valor" }
 */
async function streamExcelResponse({ res, filename, columns, fetchBatch, batchSize = 3000, filters }) {
  const safeFilename = filename.replace(/[^\w\-_.()áéíóúÁÉÍÓÚñÑ ]/g, '_')

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`)
  res.setHeader('Cache-Control', 'no-store')

  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res })

  // Hoja de filtros primero (si hay)
  await _addFiltersSheet(wb, filters, true)

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
