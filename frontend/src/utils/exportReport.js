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

// ─── Casos: FORMULARIOS X CASO ─────────────────────────────────────────────────
// Cada registro de Seguimiento CPH / CEETPS se agrupa en un "caso" (ver el Word
// "FORMULARIOS X CASO"), que determina: si corresponde el documento de Validación
// (cuadro rojo, se manda a Hacienda) además del de Autorización (rojo + verde),
// qué título lleva el cuadro rojo, y qué campos entran en cada cuadro.
//
// Algunos textos citan normativa o expedientes que el sistema no registra todavía
// (fundamento del Decreto 315/22, justificación de una Ampliación puntual). En esos
// casos se inserta un texto "[COMPLETAR: ...]" que queda editable en el Word — no
// hay forma de completarlo solo automáticamente.

const ESCALAFON_CPH = 'Carrera de Profesionales de la Salud'
const ESCALAFON_CEETPS = {
  87: 'Enfermería Profesional del Sistema Público de Salud',
  85: 'Carrera de Especialidades Técnico Profesionales de la Salud',
  83: 'Carrera de la Administración Pública - Anexo II',
}

const efectorTexto = (sigla, descr) => sigla ? `${sigla} - ${descr || ''}` : (descr || '')

/** Caso de un registro de Seguimiento CPH (ver FORMULARIOS X CASO, sección CPH). */
export function getCasoCph(d) {
  const efector      = efectorTexto(d.sigla_efector, d.descr_efector)
  const puestoBaja    = d.puesto_1 || d.puesto_2 || ''
  const puestoSolic   = d.puesto_2 || d.puesto_1 || ''
  const especBaja     = d.especialidad_baja || '-'
  const especSolic    = d.especialidad_solicitada || d.especialidad_baja || '-'
  const esSolicitud   = d.origen === 'Ampliación' || d.origen === 'POU a POF'
  const esSuplente    = d.unificador_puestos === 'Suplente de Guardia'
  const esJefatura    = d.unificador_puestos === 'Jefaturas'
  const esCobertura   = d.origen === 'Cobertura Dotación'
  const codigoRegistro = esSuplente ? '23' : '37'

  // 4 — Ampliación / POU a POF: no surge de una baja real sino de un expediente
  // de solicitud ya validado → solo Autorización, caja roja "AMPLIACIÓN".
  if (esSolicitud) {
    return {
      caso: 'CPH_AMPLIACION',
      autorizacion: {
        intro: 'La presente procesa el registro de la cobertura de:',
        boxTitulo: 'AMPLIACIÓN',
        campos: [
          ['Repartición', efector],
          ['EE de solicitud', d.ee_baja],
          ['Carrera', ESCALAFON_CPH],
          ['Puesto', puestoBaja],
          ['Especialidad', especBaja],
          ['Código de Registro', codigoRegistro],
        ],
        cierre: 'Asimismo, se AUTORIZA la cobertura de las vacantes, según detalle:',
        camposVerde: [
          ['Expediente de Concurso', d.ee_concurso],
          ['Cantidad de Cargos', '1'],
          ['Puesto', puestoSolic],
          ['Especialidad', especSolic],
          ['Efector', efector],
        ],
      },
    }
  }

  const camposBaja = (puesto) => [
    ['Repartición', efector],
    ['EE de Baja', d.ee_baja],
    ['Nombre y Apellido', d.nombre_baja],
    ['CUIL', d.cuil_baja],
    ['Puesto', puesto],
    ['Especialidad', especBaja],
    ['Escalafón', ESCALAFON_CPH],
    ['Tipo', d.motivo_baja],
    ['Código de Registro', codigoRegistro],
    ['Fecha de Baja', d.fecha_baja],
  ]

  // 3 — Suplente de guardia: no pasa por Hacienda → solo Autorización, con el
  // puesto marcado "- Suplente".
  if (esSuplente) {
    return {
      caso: 'CPH_SUPLENTE',
      autorizacion: {
        intro: 'La presente procesa el registro de la baja de:',
        boxTitulo: 'BAJA',
        campos: camposBaja(`${puestoBaja} - Suplente`),
        cierre: 'Asimismo, se autoriza la cobertura de la vacante, en reemplazo de la mencionada baja.',
        camposVerde: [
          ['Expediente de Concurso', d.ee_concurso],
          ['Cantidad de Cargos', '1'],
          ['Puesto', `${puestoSolic} - Suplente`],
          ['Especialidad', especSolic],
          ['Efector', efector],
          ['Partida Presupuestaria', d.partida_presupuestaria],
        ],
      },
    }
  }

  // 2 — Cobertura de dotación POU: sin Nombre/CUIL (no hay una persona puntual) +
  // nota del Decreto 315/22 (el fundamento puntual se completa a mano en el Word).
  if (esCobertura) {
    const camposCobertura = (eeLabel) => [
      ['Repartición', efector],
      [eeLabel, d.ee_baja],
      ['Puesto', puestoBaja],
      ['Especialidad', especBaja],
      ['Escalafón', ESCALAFON_CPH],
      ['Tipo', d.motivo_baja],
      ['Código de Registro', codigoRegistro],
      ['Fecha de Baja', d.fecha_baja],
    ]
    const decreto = `En virtud de lo dictado en el Decto. 315/22 y sus resoluciones modificatorias, y atendiendo la dotación de personal [COMPLETAR: ej. "de la Guardia Médica"] del ${d.descr_efector || '[Efector]'}, se considera pertinente iniciar un (1) proceso concursal para cubrir el cargo de ${puestoBaja || '[Puesto]'} (${especBaja}), en carácter titular, en función de lo solicitado en el expediente N° ${d.ee_baja || '[Expediente]'}.`
    return {
      caso: 'CPH_COBERTURA_POU',
      validacion: {
        intro: 'La presente procesa el registro de la baja de:',
        boxTitulo: 'SOLICITUD',
        campos: camposCobertura('EE de Solicitud'),
        cierre: `Asimismo, se solicita la validación de la vacante originada por la baja mencionada.\n\n${decreto}`,
      },
      autorizacion: {
        intro: 'En la presente se procesa la baja que se menciona a continuación:',
        boxTitulo: 'COBERTURA',
        campos: camposCobertura('EE de Baja'),
        cierre: `Asimismo, se autoriza la vacante por la baja indicada.\n\n${decreto}`,
        camposVerde: [
          ['Expediente de Concurso', d.ee_concurso],
          ['Cantidad de Cargos', '1'],
          ['Puesto', puestoSolic],
          ['Especialidad', especSolic],
          ['Efector', efector],
        ],
      },
    }
  }

  // 1 — Estándar / 1b — Jefaturas: mismo layout; en Jefaturas la Especialidad del
  // cuadro verde va siempre "-" (quien asuma el cargo puede no ser de esa especialidad).
  return {
    caso: esJefatura ? 'CPH_JEFATURAS' : 'CPH_ESTANDAR',
    validacion: {
      intro: 'La presente procesa el registro de la baja de:',
      boxTitulo: 'BAJA',
      campos: camposBaja(puestoBaja),
      cierre: 'Asimismo, se solicita la validación de la vacante por la baja indicada.',
    },
    autorizacion: {
      intro: 'La presente procesa el registro de la baja de:',
      boxTitulo: 'BAJA',
      campos: camposBaja(puestoBaja),
      cierre: 'Asimismo, se autoriza la vacante por la baja indicada.',
      camposVerde: [
        ['Expediente de Concurso', d.ee_concurso],
        ['Cantidad de Cargos', '1'],
        ['Puesto', puestoSolic],
        ['Especialidad', esJefatura ? '-' : especSolic],
        ['Efector', efector],
        ['Partida Presupuestaria', d.partida_presupuestaria],
      ],
    },
  }
}

/** Caso de un registro de Seguimiento CEETPS (Enfermería 87 / Técnicos 85 / Servicios Generales 83). */
export function getCasoCeetps(d) {
  const codigo         = Number(d.codigo_registro)
  const efector         = efectorTexto(d.sigla_efector, d.descr_efector)
  const escalafonTexto  = ESCALAFON_CEETPS[codigo] || ''
  const puestoBaja      = d.puesto_baja || ''
  const puestoSolic     = d.puesto_solicitado || d.puesto_baja || ''
  const especBaja       = d.especialidad_baja || '-'
  const esAmpliacion    = d.tipificador_origen === 'Ampliación' || d.tipificador_origen === 'POU a POF'
  const conCarga        = codigo === 87 || codigo === 85
  const filaCarga       = conCarga ? [['Carga Horaria', d.carga_horaria ? `${d.carga_horaria} HS` : '']] : []

  const camposBaja = (puesto = puestoBaja) => [
    ['Repartición', efector],
    ['EE de Baja', d.ex_baja],
    ['Nombre y Apellido', d.nombre_apellido_baja],
    ['CUIL', d.cuil],
    ['Puesto', puesto],
    ['Especialidad', especBaja],
    ['Escalafón', escalafonTexto],
    ['Tipo', d.motivo_baja],
    ['Código de Registro', String(codigo || '')],
    ['Fecha de Baja', d.fecha_baja],
    ...filaCarga,
  ]

  // ── Enfermería (87) ──────────────────────────────────────────────────────
  if (codigo === 87) {
    // Ampliación: no surge de una baja real → solo Autorización, caja "SOLICITUD".
    if (esAmpliacion) {
      return {
        caso: 'CEETPS_ENF_AMPLIACION',
        autorizacion: {
          intro: 'La presente procesa el registro de solicitud:',
          boxTitulo: 'SOLICITUD',
          campos: [
            ['Repartición', efector],
            ['EE de Solicitud', d.ex_baja],
            ['Carrera', escalafonTexto],
            ['Puesto', puestoBaja],
            ['Especialidad', especBaja],
            ['Código de Registro', String(codigo)],
            ...filaCarga,
          ],
          cierre: 'Asimismo, se AUTORIZA la cobertura de las vacantes que a continuación se detallan.\n\n[COMPLETAR: fundamento / justificación de la ampliación]',
          camposVerde: [
            ['Expediente(s) de Concurso', d.expediente_concurso],
            ['Cantidad de Cargos', '1'],
            ['Puesto', puestoSolic],
            ['Especialidad', especBaja],
            ['Efector', efector],
            ...filaCarga,
          ],
        },
      }
    }

    // Apertura 2x18hs: 1 cargo de 35hs se abre en 2 de 18hs (campos apertura_2x18 /
    // informe_apertura / expediente_concurso_2 cargados en el formulario).
    if (d.apertura_2x18) {
      const nota = `Cabe destacar que, según el informe N° ${d.informe_apertura || '[N° de informe]'}, se solicitó cubrir dos (2) cargos de Enfermería ATP de 18hs, los cuales tramitan mediante ${d.expediente_concurso || '[Expediente 1]'} y ${d.expediente_concurso_2 || '[Expediente 2]'}.`
      return {
        caso: 'CEETPS_ENF_APERTURA',
        validacion: {
          intro: 'La presente procesa el registro de la baja de:',
          boxTitulo: 'BAJA',
          campos: camposBaja(),
          cierre: `Asimismo, se solicita la validación de la vacante por la baja indicada.\n\n${nota}`,
        },
        autorizacion: {
          intro: 'La presente procesa el registro de la baja de:',
          boxTitulo: 'BAJA',
          campos: camposBaja(),
          cierre: `Asimismo, se autoriza la vacante por la baja indicada.\n\n${nota}`,
          camposVerde: [
            ['Expediente(s) de Concurso', [d.expediente_concurso, d.expediente_concurso_2].filter(Boolean).join(' / ')],
            ['Cantidad de Cargos', '2'],
            ['Puesto', 'Enfermería'],
            ['Especialidad', '-'],
            ['Efector', efector],
            ['Carga Horaria', '18hs'],
          ],
        },
      }
    }

    // Estándar: puesto del cuadro verde siempre "Enfermería Profesional".
    return {
      caso: 'CEETPS_ENF_ESTANDAR',
      validacion: {
        intro: 'La presente procesa el registro de la baja de:',
        boxTitulo: 'BAJA',
        campos: camposBaja(),
        cierre: 'Asimismo, se solicita la validación de la vacante por la baja indicada.',
      },
      autorizacion: {
        intro: 'La presente procesa el registro de la baja de:',
        boxTitulo: 'BAJA',
        campos: camposBaja(),
        cierre: 'Asimismo, se autoriza cobertura de la vacante en reemplazo de la mencionada baja.',
        camposVerde: [
          ['Expediente de Concurso', d.expediente_concurso],
          ['Cantidad de Cargos', '1'],
          ['Puesto', 'Enfermería Profesional'],
          ['Especialidad', '-'],
          ['Efector', efector],
          ['Partida Presupuestaria', d.partida_presupuestaria],
          ...filaCarga,
        ],
      },
    }
  }

  // ── Técnicos (85) ────────────────────────────────────────────────────────
  if (codigo === 85) {
    if (esAmpliacion) {
      return {
        caso: 'CEETPS_TEC_AMPLIACION',
        autorizacion: {
          intro: 'La presente procesa el registro de la cobertura de:',
          boxTitulo: 'AMPLIACIÓN',
          campos: [
            ['Repartición', efector],
            ['EE de Ampliación', d.ex_baja],
            ['Puesto', puestoBaja],
            ['Especialidad', especBaja],
            ['Escalafón', escalafonTexto],
            ['Tipo', 'Ampliación'],
            ['Código de Registro', String(codigo)],
            ['Fecha de Ampliación', d.fecha_baja],
          ],
          cierre: 'Asimismo, se AUTORIZA la cobertura de la vacante de:\n\n[COMPLETAR: fundamento / justificación de la ampliación]',
          camposVerde: [
            ['Expediente(s) de Concurso', d.expediente_concurso],
            ['Cantidad de Cargos', '1'],
            ['Puesto', puestoSolic],
            ['Especialidad', especBaja],
            ['Efector', efector],
            ...filaCarga,
          ],
        },
      }
    }

    return {
      caso: 'CEETPS_TEC_ESTANDAR',
      validacion: {
        intro: 'La presente procesa el registro de la baja de:',
        boxTitulo: 'BAJA',
        campos: camposBaja(),
        cierre: 'Asimismo, se solicita la validación de la vacante por la baja indicada.',
      },
      autorizacion: {
        intro: 'La presente procesa el registro de la baja de:',
        boxTitulo: 'BAJA',
        campos: camposBaja(),
        cierre: 'Asimismo, se autoriza la vacante por la baja indicada.',
        camposVerde: [
          ['Expediente de Concurso', d.expediente_concurso],
          ['Cantidad de Cargos', '1'],
          ['Puesto', puestoSolic],
          ['Especialidad', especBaja],
          ['Efector', efector],
          ['Partida Presupuestaria', d.partida_presupuestaria],
          ...filaCarga,
        ],
      },
    }
  }

  // ── Servicios Generales (83) — sin excepciones ──────────────────────────
  return {
    caso: 'CEETPS_SERV_ESTANDAR',
    validacion: {
      intro: 'La presente procesa el registro de la baja de:',
      boxTitulo: 'BAJA',
      campos: camposBaja(),
      cierre: 'Así mismo se solicita la validación de la vacante por la baja mencionada.',
    },
    autorizacion: {
      intro: 'La presente procesa el registro de la baja de:',
      boxTitulo: 'BAJA',
      campos: camposBaja(),
      cierre: 'Asimismo, se AUTORIZA la cobertura de la vacante, en reemplazo de la mencionada baja.',
      camposVerde: [
        ['Expediente de Concurso', d.expediente_concurso],
        ['Cantidad de Cargos', '1'],
        ['Puesto', puestoSolic],
        ['Especialidad', especBaja],
        ['Efector', efector],
        ['Partida Presupuestaria', d.partida_presupuestaria],
      ],
    },
  }
}

// ─── PDF: render genérico por caso ─────────────────────────────────────────────
function pdfParrafo(doc, y, texto, { fontSize = 9.5, color = LABEL, maxWidth = 178, lineHeight = 4.6 } = {}) {
  doc.setFontSize(fontSize)
  doc.setTextColor(...color)
  doc.setFont('helvetica', 'normal')
  const bloques = texto.split('\n\n')
  for (const bloque of bloques) {
    const lines = doc.splitTextToSize(bloque, maxWidth)
    doc.text(lines, 16, y)
    y += lines.length * lineHeight + 3
  }
  return y
}

function renderCasoPdf(seccion, tipo, filename) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw  = doc.internal.pageSize.getWidth()
  let y = 20

  if (tipo === 'autorizacion') {
    doc.setFillColor(...TEAL)
    doc.rect(0, 0, pw, 20, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('AUTORIZACIÓN PARA LA COBERTURA DE VACANTE', pw / 2, 13, { align: 'center' })
    y = 30
  }

  y = pdfParrafo(doc, y, seccion.intro, { fontSize: 10, color: INK }) + 4
  y = pdfSeccion(doc, y, seccion.boxTitulo, RED, seccion.campos.map(([l, val]) => [l, v(val)])) + 8
  y = pdfParrafo(doc, y, seccion.cierre)

  if (seccion.camposVerde) {
    y += 6
    const pageHeight = doc.internal.pageSize.getHeight()
    if (pageHeight - y < 70) { doc.addPage(); y = 20 }
    pdfSeccion(doc, y, 'AUTORIZACIÓN', GREEN, seccion.camposVerde.map(([l, val]) => [l, v(val)]))
  }

  doc.save(filename)
}

export function exportCphPdf(data, tipo) {
  const seccion = getCasoCph(data)[tipo]
  if (!seccion) return
  renderCasoPdf(seccion, tipo, `${tipo}-cph-${v(data.cuil_baja)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-'))
}

export function exportCeetpsPdf(data, tipo) {
  const seccion = getCasoCeetps(data)[tipo]
  if (!seccion) return
  renderCasoPdf(seccion, tipo, `${tipo}-ceetps-${v(data.cuil)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-'))
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

// ─── WORD: render genérico por caso ────────────────────────────────────────────
function wordBanner() {
  return new Table({
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
}

// Los bloques separados por "\n\n" (p.ej. cierre + nota/decreto) se parten en
// párrafos aparte para que las notas con "[COMPLETAR: ...]" queden editables
// como texto normal de Word.
function wordParrafos(texto, { size = 20, color = '334155', spacingBefore = 0 } = {}) {
  return texto.split('\n\n').filter(Boolean).map((bloque, i) =>
    new Paragraph({
      spacing: { before: i === 0 ? spacingBefore : 160, after: 160 },
      children: [new TextRun({ text: bloque, size, color })],
    })
  )
}

async function renderCasoWord(seccion, tipo, filename) {
  const children = []
  if (tipo === 'autorizacion') children.push(wordBanner())
  children.push(...wordParrafos(seccion.intro, { color: '0F172A', spacingBefore: tipo === 'autorizacion' ? 280 : 0 }))
  children.push(wordTabla(seccion.boxTitulo, 'DC2626', seccion.campos))
  children.push(...wordParrafos(seccion.cierre, { color: tipo === 'autorizacion' ? '0F172A' : '334155', spacingBefore: 280 }))
  if (seccion.camposVerde) {
    children.push(wordTabla('AUTORIZACIÓN', '059669', seccion.camposVerde))
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 800, right: 900, bottom: 800, left: 900 } } },
      children,
    }],
  })

  await descargarDocx(doc, filename)
}

export async function exportCphWord(data, tipo) {
  const seccion = getCasoCph(data)[tipo]
  if (!seccion) return
  await renderCasoWord(seccion, tipo, `${tipo}-cph-${v(data.cuil_baja)}.docx`.replace(/[^a-zA-Z0-9._-]/g, '-'))
}

export async function exportCeetpsWord(data, tipo) {
  const seccion = getCasoCeetps(data)[tipo]
  if (!seccion) return
  await renderCasoWord(seccion, tipo, `${tipo}-ceetps-${v(data.cuil)}.docx`.replace(/[^a-zA-Z0-9._-]/g, '-'))
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
  { header: 'Efector',              get: r => r.descr_efector },
  { header: 'Sigla',                get: r => r.sigla_efector },
  { header: 'Tipo efector',         get: r => r.tipo_efector },
  { header: 'Origen',               get: r => r.origen },
  { header: 'Conjuntos',            get: r => r.conjuntos },
  { header: 'Obra',                 get: r => r.obra ? 'Sí' : 'No' },
  { header: 'Estado',               get: r => r.estado },
  { header: 'Sub-estado',           get: r => r.sub_estado },
  { header: 'Sub-estado 3',         get: r => r.sub_estado_3 },
  { header: 'Cargo baja (POU)',     get: r => r.cargo_baja },
  { header: 'EE baja',              get: r => r.ee_baja },
  { header: 'CUIL',                 get: r => r.cuil_baja },
  { header: 'Nombre baja',          get: r => r.nombre_baja },
  { header: 'Fecha baja',           get: r => r.fecha_baja },
  { header: 'Escalafón',            get: r => r.escalafon_1 },
  { header: 'Puesto',               get: r => r.puesto_1 },
  { header: 'Especialidad baja',    get: r => r.especialidad_baja },
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
  { header: 'Dispo. desierta',      get: r => r.dispo_desierta },
  { header: 'F. dispo. desierta',   get: r => r.fecha_dispo_desierta },
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
