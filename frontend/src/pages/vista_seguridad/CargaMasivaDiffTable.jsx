import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Spinner from '../../components/ui/Spinner'

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-gray-50 text-gray-700 border-gray-200',
    green:   'bg-green-50 text-green-700 border-green-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    red:     'bg-red-50 text-red-700 border-red-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-xl font-bold">{value.toLocaleString('es-AR')}</div>
    </div>
  )
}

function PreviewTable({ title, maxH = 'max-h-72', headers, rows, renderRow }) {
  if (!rows?.length) return null
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
      <div className={`overflow-auto ${maxH} border border-gray-200 rounded`}>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>{headers.map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>
    </div>
  )
}

export default function CargaMasivaDiffTable({
  preview, tipo,
  modOverrides, delOverrides,
  onToggleMod, onToggleDel,
  onMarcarTodosMod, onMarcarTodosDel,
  onCancelar, onConfirmar,
  confirming,
}) {
  const TIPOS_IDENTIDAD = {
    dotacion: ['CUIL', 'Nombre', 'Cargo'],
    pou:      ['Sigla', 'Perfil', 'Especialidad'],
  }
  const [col1, col2, col3] = TIPOS_IDENTIDAD[tipo]
  const identidadDe = (row) => tipo === 'pou'
    ? [row.sigla, row.perfil, row.especialidad]
    : [row.cuil, row.nombre, row.cargo]
  const filaInvalidaId = (f) => tipo === 'pou' ? f.sigla : f.cuil

  return (
    <div className="space-y-5">
      <div className="text-sm text-gray-600">
        Archivo <span className="font-medium">{preview.archivo}</span> — período <span className="font-medium">{preview.periodo}</span>
        {preview.periodoComparacion
          ? <> — comparado contra <span className="font-medium">{preview.periodoComparacion}</span></>
          : <> — sin período anterior (todo se muestra como nuevo)</>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <StatCard label="Nuevos"       value={preview.resumen.nuevos}       tone="green" />
        <StatCard label="Modificados"  value={preview.resumen.modificados}  tone="amber" />
        <StatCard label="Sin cambios"  value={preview.resumen.sinCambios} />
        <StatCard label="Eliminados"   value={preview.resumen.eliminados}   tone="red" />
        {preview.resumen.siglasNuevas      !== undefined && <StatCard label="Siglas nuevas"      value={preview.resumen.siglasNuevas}      tone="blue" />}
        {preview.resumen.siglasModificadas !== undefined && <StatCard label="Siglas modificadas" value={preview.resumen.siglasModificadas} tone="blue" />}
        <StatCard label="Filas inválidas" value={preview.resumen.filasInvalidas} tone={preview.resumen.filasInvalidas > 0 ? 'red' : 'default'} />
        {preview.resumen.advertencias !== undefined && (
          <StatCard label="Advertencias" value={preview.resumen.advertencias} tone={preview.resumen.advertencias > 0 ? 'amber' : 'default'} />
        )}
      </div>

      {preview.columnasNoMapeadas?.length > 0 && (
        <details className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
          <summary className="cursor-pointer font-medium">Columnas no importadas ({preview.columnasNoMapeadas.length})</summary>
          <p className="mt-1">{preview.columnasNoMapeadas.join(', ')}</p>
        </details>
      )}

      {(preview.columnasFaltantesEnArchivo?.length > 0 || preview.columnasDesconocidasEnArchivo?.length > 0) && (
        <div className="flex items-start gap-2 p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            {preview.columnasFaltantesEnArchivo?.length > 0 && <p>Faltan columnas: {preview.columnasFaltantesEnArchivo.join(', ')}</p>}
            {preview.columnasDesconocidasEnArchivo?.length > 0 && <p>Columnas nuevas no reconocidas: {preview.columnasDesconocidasEnArchivo.join(', ')}</p>}
          </div>
        </div>
      )}

      <PreviewTable
        title={`Filas inválidas — no se importan (${preview.resumen.filasInvalidas})`}
        maxH="max-h-48"
        headers={['Fila', col1, 'Motivo']}
        rows={preview.filasInvalidas}
        renderRow={(f) => (
          <tr key={f.rowNumber} className="border-t border-gray-100">
            <td className="px-2 py-1">{f.rowNumber}</td>
            <td className="px-2 py-1">{filaInvalidaId(f)}</td>
            <td className="px-2 py-1 text-red-600">{f.errores.map(e => e.motivo).join('; ')}</td>
          </tr>
        )}
      />

      <PreviewTable
        title={`Advertencias (${preview.resumen.advertencias})`}
        maxH="max-h-48"
        headers={['Fila', 'CUIL', 'Advertencia']}
        rows={preview.advertencias}
        renderRow={(f) => (
          <tr key={f.rowNumber} className="border-t border-gray-100">
            <td className="px-2 py-1">{f.rowNumber}</td>
            <td className="px-2 py-1">{f.cuil}</td>
            <td className="px-2 py-1 text-amber-700">{f.advertencias.map(a => a.motivo).join('; ')}</td>
          </tr>
        )}
      />

      <PreviewTable
        title={`Nuevos — no estaban en ${preview.periodoComparacion || 'el período anterior'} (${preview.resumen.nuevos})`}
        headers={[col1, col2, col3]}
        rows={preview.nuevos}
        renderRow={(n, i) => {
          const [id1, id2, id3] = identidadDe(n)
          return (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-2 py-1.5 whitespace-nowrap">{id1}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{id2}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{id3 || '—'}</td>
            </tr>
          )
        }}
      />
      {preview.resumen.nuevos > preview.nuevos?.length && (
        <p className="text-xs text-gray-400 -mt-3">Mostrando los primeros {preview.nuevos.length} de {preview.resumen.nuevos}.</p>
      )}

      {preview.modificados?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-800">Modificados ({preview.resumen.modificados}) — por defecto se usa el valor del archivo</h2>
            <div className="flex gap-2 text-xs">
              <button onClick={() => onMarcarTodosMod(false)} className="text-primary-700 hover:underline">Usar nuevo (todos)</button>
              <button onClick={() => onMarcarTodosMod(true)}  className="text-gray-500 hover:underline">Mantener actual (todos)</button>
            </div>
          </div>
          <div className="overflow-auto max-h-72 border border-gray-200 rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {[col1, col2, col3, 'Cambios', 'Usar'].map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.modificados.map((m) => {
                  const useActual = modOverrides[m.entryKey] === 'actual'
                  const [id1, id2, id3] = identidadDe(m)
                  return (
                    <tr key={m.entryKey} className="border-t border-gray-100 align-top">
                      <td className="px-2 py-1.5 whitespace-nowrap">{id1}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{id2}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{id3}</td>
                      <td className="px-2 py-1.5">
                        {m.cambios.map((c, i) => (
                          <div key={i} className="text-gray-600">
                            <span className="font-mono text-[11px]">{c.entity ? `${c.entity}.${c.field}` : c.field}</span>:{' '}
                            <span className="text-red-500 line-through">{String(c.oldValue ?? '—')}</span>{' → '}
                            <span className="text-green-600">{String(c.newValue ?? '—')}</span>
                          </div>
                        ))}
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={useActual ? 'actual' : 'nuevo'} onChange={(e) => onToggleMod(m.entryKey, e.target.value === 'actual')} className="form-input text-xs py-1">
                          <option value="nuevo">Usar nuevo</option>
                          <option value="actual">Mantener actual</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {preview.resumen.modificados > preview.modificados.length && (
            <p className="text-xs text-gray-400 mt-1">Mostrando los primeros {preview.modificados.length} de {preview.resumen.modificados}.</p>
          )}
        </div>
      )}

      {preview.eliminados?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-800">Ya no están en el archivo ({preview.resumen.eliminados}) — por defecto se eliminan</h2>
            <div className="flex gap-2 text-xs">
              <button onClick={() => onMarcarTodosDel(false)} className="text-red-600 hover:underline">Eliminar (todos)</button>
              <button onClick={() => onMarcarTodosDel(true)}  className="text-gray-500 hover:underline">Mantener (todos)</button>
            </div>
          </div>
          <div className="overflow-auto max-h-72 border border-gray-200 rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>{[col1, col2, col3, 'Acción'].map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.eliminados.map((e) => {
                  const mantener = delOverrides[e.entryKey] === 'mantener'
                  const [id1, id2, id3] = identidadDe(e)
                  return (
                    <tr key={e.entryKey} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 whitespace-nowrap">{id1}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{id2}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{id3 || '—'}</td>
                      <td className="px-2 py-1.5">
                        <select value={mantener ? 'mantener' : 'eliminar'} onChange={(ev) => onToggleDel(e.entryKey, ev.target.value === 'mantener')} className="form-input text-xs py-1">
                          <option value="eliminar">Eliminar</option>
                          <option value="mantener">Mantener</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {preview.resumen.eliminados > preview.eliminados.length && (
            <p className="text-xs text-gray-400 mt-1">Mostrando los primeros {preview.eliminados.length} de {preview.resumen.eliminados}.</p>
          )}
        </div>
      )}

      {preview.siglasNuevas?.length > 0 && (
        <PreviewTable
          title={`Siglas nuevas (${preview.resumen.siglasNuevas})`}
          maxH="max-h-48"
          headers={['ID Sigla', 'Sigla', 'Universo totalizador']}
          rows={preview.siglasNuevas}
          renderRow={(s) => (
            <tr key={s.idSigla} className="border-t border-gray-100">
              <td className="px-2 py-1.5 whitespace-nowrap">{s.idSigla}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{s.sigla}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{s.universoTotalizador || '—'}</td>
            </tr>
          )}
        />
      )}

      {preview.siglasModificadas?.length > 0 && (
        <PreviewTable
          title={`Siglas modificadas (${preview.resumen.siglasModificadas})`}
          maxH="max-h-48"
          headers={['ID Sigla', 'Sigla', 'Cambios']}
          rows={preview.siglasModificadas}
          renderRow={(s) => (
            <tr key={s.idSigla} className="border-t border-gray-100 align-top">
              <td className="px-2 py-1.5 whitespace-nowrap">{s.idSigla}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{s.sigla}</td>
              <td className="px-2 py-1.5">
                {s.cambios.map((c, i) => (
                  <div key={i} className="text-gray-600">
                    <span className="font-mono text-[11px]">{c.field}</span>:{' '}
                    <span className="text-red-500 line-through">{String(c.oldValue ?? '—')}</span>{' → '}
                    <span className="text-green-600">{String(c.newValue ?? '—')}</span>
                  </div>
                ))}
              </td>
            </tr>
          )}
        />
      )}

      <div className="flex gap-3 pt-2 pb-6">
        <button onClick={onCancelar} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirmar} disabled={confirming} className="btn-primary flex items-center gap-2">
          {confirming ? <Spinner size="sm" /> : <CheckCircleIcon className="w-4 h-4" />}
          Confirmar carga
        </button>
      </div>
    </div>
  )
}
