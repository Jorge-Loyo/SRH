import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, ShadingType, BorderStyle,
} from 'docx'
import * as XLSX from 'xlsx'

// ─── Paleta ───────────────────────────────────────────────────────────────────
const RED   = [220, 38, 38]
const GREEN = [5, 150, 105]
const TEAL  = [42, 113, 133]
const S50   = [248, 250, 252]
const S100  = [241, 245, 249]
const S200  = [226, 232, 240]
const S500  = [100, 116, 139]
const WHITE = [255, 255, 255]
const INK   = [15, 23, 42]
const LABEL = [30, 41, 59]

const v = (x) => (x != null && x !== '') ? String(x) : '—'
const fmtFecha = (x) => { if (x == null || x === '') return '—'; return String(x).replace(/-/g, '/') }

// ─── PDF: sección tabla ───────────────────────────────────────────────────────
function pdfSeccion(doc, y, cabecera, color, filas) {
  autoTable(doc, {
    startY: y,
    head: [[{ content: cabecera, colSpan: 2 }]],
    body: filas,
    margin: { left: 16, right: 16 },
    theme: 'grid',
    headStyles: {
      fillColor: color,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center',
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 68, fillColor: S50, textColor: LABEL, fontSize: 9.5 },
      1: { textColor: INK, fontSize: 9.5 },
    },
    alternateRowStyles: { fillColor: S100 },
    styles: {
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      lineColor: S200,
      lineWidth: 0.25,
    },
  })
  return doc.lastAutoTable.finalY
}

// ─── PDF: BAJA ────────────────────────────────────────────────────────────────
export function exportBajaToPdf(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = 20

  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  doc.text('La presente procesa el registro de la baja de:', 16, y)
  y += 10

  const filas = [
    ['Repartición',        v(data.sigla ? `${data.sigla} - ${data.efector}` : data.efector)],
    ['EE de Baja',         v(data.ex_baja)],
    ['Nombre y Apellido',  v(data.nombre_apellido)],
    ['CUIL',               v(data.cuil)],
    ['Puesto',             v(data.puesto_baja)],
    ['Especialidad',       data.especialidad_baja || '-'],
    ['Escalafón',          v(data.escalafon)],
    ['Tipo',               v(data.motivo_baja)],
    ['Código de Registro', v(data.codigo_registro)],
    ['Fecha de Baja',      fmtFecha(data.fecha_baja)],
    ['Carga Horaria',      v(data.carga_horaria)],
  ]

  const endY = pdfSeccion(doc, y, 'BAJA', RED, filas)

  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  doc.text('Asimismo, se solicita la validación de la vacante por la baja indicada.', 16, endY + 10)

  doc.save(`baja-${v(data.cuil)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-'))
}

// ─── PDF: SEGUIMIENTO ─────────────────────────────────────────────────────────
export function exportSeguimientoToPdf(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw  = doc.internal.pageSize.getWidth()

  // Banner teal con el título
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, pw, 20, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('AUTORIZACIÓN PARA LA COBERTURA DE VACANTE', pw / 2, 13, { align: 'center' })

  let y = 30

  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  doc.text('La presente procesa el registro de la baja de:', 16, y)
  y += 10

  const filasBaja = [
    ['Repartición',        v(data.sigla_efector ? `${data.sigla_efector} - ${data.descr_efector}` : data.descr_efector)],
    ['EE de Baja',         v(data.ee_baja)],
    ['Nombre y Apellido',  v(data.nombre_baja)],
    ['CUIL',               v(data.cuil_baja)],
    ['Puesto',             v(data.puesto_1)],
    ['Especialidad',       data.especialidad_baja || '-'],
    ['Escalafón',          v(data.escalafon_baja)],
    ['Tipo',               v(data.motivo_baja)],
    ['Código de Cargo',    v(data.cargo)],
    ['Fecha de Baja',      fmtFecha(data.fecha_baja)],
  ]

  y = pdfSeccion(doc, y, 'BAJA', RED, filasBaja)
  y += 10

  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  doc.text('Asimismo, se AUTORIZA la cobertura de la vacante que a continuación se detalla:', 16, y)
  y += 10

  const pageHeight = doc.internal.pageSize.getHeight()
  if (pageHeight - y < 80) {
    doc.addPage()
    y = 20
  }

  const filasConcurso = [
    ['Expediente de Concurso', v(data.ee_concurso)],
    ['Cantidad de Cargos',     '1'],
    ['Puesto',                 v(data.puesto_2 || data.puesto_1)],
    ['Especialidad',           (data.especialidad_solicitada || data.especialidad_baja) || '-'],
    ['Efector',                v(data.sigla_efector ? `${data.sigla_efector} - ${data.descr_efector}` : data.descr_efector)],
    ['Partida Presupuestaria', v(data.partida_presupuestaria)],
    ['Carga Horaria',          data.carga_horaria ? `${data.carga_horaria} Hs.` : '—'],
  ]

  pdfSeccion(doc, y, 'AUTORIZACIÓN', GREEN, filasConcurso)
  doc.save(`seguimiento-cph-${v(data.cuil_baja)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-'))
}

// ─── WORD: helpers ────────────────────────────────────────────────────────────
const BORDE = (color = 'CBD5E1') => ({
  top:     { style: BorderStyle.SINGLE, size: 4, color },
  bottom:  { style: BorderStyle.SINGLE, size: 4, color },
  left:    { style: BorderStyle.SINGLE, size: 4, color },
  right:   { style: BorderStyle.SINGLE, size: 4, color },
  insideH: { style: BorderStyle.SINGLE, size: 2, color },
  insideV: { style: BorderStyle.SINGLE, size: 2, color },
})

const BORDE_NONE = () => ({
  top:     { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideH: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideV: { style: BorderStyle.NONE, size: 0, color: 'auto' },
})

function wordTabla(cabecera, fillHex, filas) {
  return new Table({
    width: { size: 5000, type: WidthType.PERCENTAGE },
    borders: BORDE(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { fill: fillHex, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: cabecera, bold: true, size: 24, color: 'FFFFFF' })],
              }),
            ],
          }),
        ],
      }),
      ...filas.map(([label, value], i) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1750, type: WidthType.PERCENTAGE },
              shading: { fill: i % 2 === 0 ? 'F1F5F9' : 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 60, bottom: 60, left: 120, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 19, color: '1E293B' })] })],
            }),
            new TableCell({
              width: { size: 3250, type: WidthType.PERCENTAGE },
              shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'FAFAFA', type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 60, bottom: 60, left: 120, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: String(value || '—'), size: 19, color: '0F172A' })] })],
            }),
          ],
        })
      ),
    ],
  })
}

async function descargarDocx(doc, nombre) {
  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── WORD: BAJA ───────────────────────────────────────────────────────────────
export async function exportBajaToWord(data) {
  const filas = [
    ['Repartición',        v(data.sigla ? `${data.sigla} - ${data.efector}` : data.efector)],
    ['EE de Baja',         v(data.ex_baja)],
    ['Nombre y Apellido',  v(data.nombre_apellido)],
    ['CUIL',               v(data.cuil)],
    ['Puesto',             v(data.puesto_baja)],
    ['Especialidad',       data.especialidad_baja || '-'],
    ['Escalafón',          v(data.escalafon)],
    ['Tipo',               v(data.motivo_baja)],
    ['Código de Registro', v(data.codigo_registro)],
    ['Fecha de Baja',      fmtFecha(data.fecha_baja)],
    ['Carga Horaria',      v(data.carga_horaria)],
  ]

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 800, right: 900, bottom: 800, left: 900 } } },
      children: [
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: 'La presente procesa el registro de la baja de:', size: 20, color: '0F172A' })],
        }),
        wordTabla('BAJA', 'DC2626', filas),
        new Paragraph({
          spacing: { before: 360, after: 120 },
          children: [new TextRun({ text: 'Asimismo, se solicita la validación de la vacante por la baja indicada.', size: 20, color: '334155' })],
        }),
      ],
    }],
  })

  await descargarDocx(doc, `baja-${v(data.cuil)}.docx`.replace(/[^a-zA-Z0-9._-]/g, '-'))
}

// ─── WORD: SEGUIMIENTO ────────────────────────────────────────────────────────
export async function exportSeguimientoToWord(data) {
  const filasBaja = [
    ['Repartición',        v(data.sigla_efector ? `${data.sigla_efector} - ${data.descr_efector}` : data.descr_efector)],
    ['EE de Baja',         v(data.ee_baja)],
    ['Nombre y Apellido',  v(data.nombre_baja)],
    ['CUIL',               v(data.cuil_baja)],
    ['Puesto',             v(data.puesto_1)],
    ['Especialidad',       data.especialidad_baja || '-'],
    ['Escalafón',          v(data.escalafon_baja)],
    ['Tipo',               v(data.motivo_baja)],
    ['Código de Cargo',    v(data.cargo)],
    ['Fecha de Baja',      fmtFecha(data.fecha_baja)],
  ]

  const filasConcurso = [
    ['Expediente de Concurso', v(data.ee_concurso)],
    ['Cantidad de Cargos',     '1'],
    ['Puesto',                 v(data.puesto_2 || data.puesto_1)],
    ['Especialidad',           (data.especialidad_solicitada || data.especialidad_baja) || '-'],
    ['Efector',                v(data.sigla_efector ? `${data.sigla_efector} - ${data.descr_efector}` : data.descr_efector)],
    ['Partida Presupuestaria', v(data.partida_presupuestaria)],
    ['Carga Horaria',          data.carga_horaria ? `${data.carga_horaria} Hs.` : '—'],
  ]

  const titleBanner = new Table({
    width: { size: 5000, type: WidthType.PERCENTAGE },
    borders: BORDE_NONE(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: '2A7185', type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 140, bottom: 140, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'AUTORIZACIÓN PARA LA COBERTURA DE VACANTE', bold: true, size: 26, color: 'FFFFFF' })],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 800, right: 900, bottom: 800, left: 900 } } },
      children: [
        titleBanner,
        new Paragraph({
          spacing: { before: 280, after: 240 },
          children: [new TextRun({ text: 'La presente procesa el registro de la baja de:', size: 20, color: '0F172A' })],
        }),
        wordTabla('BAJA', 'DC2626', filasBaja),
        new Paragraph({
          spacing: { before: 280, after: 240 },
          children: [new TextRun({ text: 'Asimismo, se AUTORIZA la cobertura de la vacante que a continuación se detalla:', size: 20, color: '0F172A' })],
        }),
        wordTabla('AUTORIZACIÓN', '059669', filasConcurso),
      ],
    }],
  })

  await descargarDocx(doc, `seguimiento-cph-${v(data.cuil_baja)}.docx`.replace(/[^a-zA-Z0-9._-]/g, '-'))
}

// ─── EXCEL: helpers ───────────────────────────────────────────────────────────
function excelAutoWidth(ws, data) {
  const numCols = data[0]?.length ?? 0
  const widths = Array.from({ length: numCols }, (_, i) =>
    Math.min(50, Math.max(10, ...data.map(row => String(row[i] ?? '').length)) + 2)
  )
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

function descargarXlsx(wb, filename) {
  XLSX.writeFile(wb, filename)
}

// ─── EXCEL: BAJAS ─────────────────────────────────────────────────────────────
const COLS_BAJAS = [
  { header: 'Usuario',               get: r => r.usuario },
  { header: 'Origen',                get: r => r.origen },
  { header: 'EX Baja / Ampliación',  get: r => r.ex_baja },
  { header: 'Sigla',                 get: r => r.sigla },
  { header: 'Efector',               get: r => r.efector },
  { header: 'Tipo efector',          get: r => r.tipo_efector },
  { header: 'Código cargo',          get: r => r.codigo_cargo },
  { header: 'ID SIAL',               get: r => r.cargo_baja },
  { header: 'CUIL',                  get: r => r.cuil },
  { header: 'Nombre y Apellido',     get: r => r.nombre_apellido },
  { header: 'Cód. registro',         get: r => r.codigo_registro },
  { header: 'Unificador puestos',    get: r => r.unificador_puestos },
  { header: 'POU/POF',               get: r => r.pou_pof },
  { header: 'Escalafón',             get: r => r.escalafon },
  { header: 'Puesto baja',           get: r => r.puesto_baja },
  { header: 'Especialidad baja',     get: r => r.especialidad_baja },
  { header: 'Partida presup.',       get: r => r.partida_presupuestaria },
  { header: 'Fecha baja',            get: r => r.fecha_baja },
  { header: 'Carga horaria',         get: r => r.carga_horaria },
  { header: 'Motivo baja',           get: r => r.motivo_baja },
  { header: 'Doc. respaldatoria',    get: r => r.doc_respaldatoria },
  { header: 'F. pase paralelo',      get: r => r.fecha_pase_paralelo },
  { header: 'Genera concurso',       get: r => r.genera_concurso },
  { header: 'Obra',                  get: r => r.obra ? 'Sí' : 'No' },
]

export function exportBajasToExcel(rows, filename = 'bajas-consolidadas.xlsx') {
  const data = [
    COLS_BAJAS.map(c => c.header),
    ...rows.map(row => COLS_BAJAS.map(c => c.get(row) ?? '')),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  excelAutoWidth(ws, data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bajas Consolidadas')
  descargarXlsx(wb, filename)
}

// ─── EXCEL: SEGUIMIENTO ───────────────────────────────────────────────────────
const COLS_SEGUIMIENTO = [
  { header: 'Usuario',              get: r => r.usuario },
  { header: 'EE baja',              get: r => r.ee_baja },
  { header: 'CUIL',                 get: r => r.cuil_baja },
  { header: 'Nombre baja',          get: r => r.nombre_baja },
  { header: 'Fecha baja',           get: r => r.fecha_baja },
  { header: 'Escalafón',            get: r => r.escalafon_1 },
  { header: 'Puesto',               get: r => r.puesto_1 },
  { header: 'Especialidad baja',    get: r => r.especialidad_baja },
  { header: 'Sigla',                get: r => r.sigla_efector },
  { header: 'Efector',              get: r => r.descr_efector },
  { header: 'Tipo efector',         get: r => r.tipo_efector },
  { header: 'Origen',               get: r => r.origen },
  { header: 'Conjuntos',            get: r => r.conjuntos },
  { header: 'Obra',                 get: r => r.obra ? 'Sí' : 'No' },
  { header: 'Estado',               get: r => r.estado },
  { header: 'Sub-estado',           get: r => r.sub_estado },
  { header: 'Sub-estado 3',         get: r => r.sub_estado_3 },
  { header: 'Suspendido',           get: r => r.suspendido ? 'Sí' : 'No' },
  { header: 'Dispo. desierta',      get: r => r.dispo_desierta },
  { header: 'F. dispo. desierta',   get: r => r.fecha_dispo_desierta },
  { header: 'EE concurso',          get: r => r.ee_concurso },
  { header: 'F. EE concurso',       get: r => r.fecha_ee_concurso },
  { header: 'Escalafón 2',          get: r => r.escalafon_2 },
  { header: 'Puesto 2',             get: r => r.puesto_2 },
  { header: 'Especialidad sol.',    get: r => r.especialidad_solicitada },
  { header: 'IF solicitante',       get: r => r.if_solicitante },
  { header: 'F. autorización',      get: r => r.fecha_autorizacion },
  { header: 'Disposición',          get: r => r.disposicion },
  { header: 'F. insc. desde',       get: r => r.fecha_insc_desde },
  { header: 'F. insc. hasta',       get: r => r.fecha_insc_hasta },
  { header: 'Q. inscriptos',        get: r => r.q_inscriptos },
  { header: 'F. examen',            get: r => r.fecha_examen },
  { header: 'F. orden mérito',      get: r => r.fecha_orden_merito },
  { header: 'F. IFACS',             get: r => r.fecha_ifacs },
  { header: 'F. INSAL',             get: r => r.fecha_insal },
  { header: 'EE designación',       get: r => r.ee_designacion },
  { header: 'F. EE desig.',         get: r => r.fecha_ee_designacion },
  { header: 'Nombre desig.',        get: r => r.nombre_designacion },
  { header: 'CUIL desig.',          get: r => r.cuil_designacion },
  { header: 'F. apto médico',       get: r => r.fecha_apto_medico },
  { header: 'F. ITE',               get: r => r.fecha_ite },
  { header: 'Reso. designación',    get: r => r.resolucion_designacion },
  { header: 'F. resolución',        get: r => r.fecha_resolucion },
  { header: 'F. cargo',             get: r => r.fecha_cargo },
  { header: 'Cargo SIAL',           get: r => r.cargo_sial },
  { header: 'Cargo baja (POU)',     get: r => r.cargo_baja },
  { header: 'Observaciones',        get: r => r.observaciones },
]

export function exportSeguimientoToExcel(rows, filename = 'seguimiento-cph.xlsx') {
  const data = [
    COLS_SEGUIMIENTO.map(c => c.header),
    ...rows.map(row => COLS_SEGUIMIENTO.map(c => c.get(row) ?? '')),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  excelAutoWidth(ws, data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Seguimiento CPH')
  descargarXlsx(wb, filename)
}
