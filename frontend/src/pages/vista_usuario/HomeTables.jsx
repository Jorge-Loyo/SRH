import { memo } from 'react'

function fmtCount(n) {
  return n ? Number(n).toLocaleString('es-AR') : '–'
}

export const DrillCell = memo(({ value, onClick, bold }) => (
  <button
    type="button"
    disabled={!value}
    onClick={onClick}
    title={value ? 'Ver el detalle en Dotación Total' : undefined}
    className={[
      'w-full text-center',
      bold ? 'font-medium text-gray-900' : 'text-gray-800',
      value ? 'cursor-pointer hover:underline hover:text-primary-700' : 'cursor-default',
    ].join(' ')}
  >
    {fmtCount(value)}
  </button>
))
DrillCell.displayName = 'DrillCell'

export const PivotTable = memo(({ title, rowLabel, pivot, onDrill }) => {
  const { situaciones, rowKeys, matrix, totals } = pivot
  return (
    <div className="mb-6">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">
                {title}
              </th>
              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" colSpan={situaciones.length + 1}>
                SITUACIÓN DE REVISTA
              </th>
            </tr>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-r border-gray-200 min-w-[180px] sm:min-w-[220px]">
                {rowLabel}
              </th>
              {situaciones.map(s => (
                <th key={s} className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-r border-gray-200">
                  {s}
                </th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-gray-200">
                Suma total
              </th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.length === 0 ? (
              <tr>
                <td colSpan={situaciones.length + 2} className="px-3 py-6 text-center text-sm text-gray-400">
                  Sin datos para los filtros seleccionados
                </td>
              </tr>
            ) : rowKeys.map((rowKey, idx) => {
              const rowTotal = situaciones.reduce((sum, s) => sum + (matrix[rowKey]?.[s] || 0), 0)
              return (
                <tr key={rowKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-800 border-b border-r border-gray-100 text-xs">
                    {rowKey}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-1.5 text-center border-b border-r border-gray-100">
                      <DrillCell value={matrix[rowKey]?.[s]} onClick={() => onDrill(rowKey, s)} />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center border-b border-gray-100">
                    <DrillCell value={rowTotal} onClick={() => onDrill(rowKey, undefined)} bold />
                  </td>
                </tr>
              )
            })}
            <tr className="bg-gray-200 font-semibold">
              <td className="px-3 py-2 text-xs text-gray-800 border-r border-gray-300">Suma total</td>
              {situaciones.map(s => (
                <td key={s} className="px-3 py-2 text-center border-r border-gray-300">
                  <DrillCell value={totals[s]} onClick={() => onDrill(undefined, s)} bold />
                </td>
              ))}
              <td className="px-3 py-2 text-center">
                <DrillCell value={totals.__grand} onClick={() => onDrill(undefined, undefined)} bold />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
})
PivotTable.displayName = 'PivotTable'

export const HierarchicalTable = memo(({ hier, level3Label, onDrill }) => {
  const { tableRows, situaciones, grandTotals } = hier

  if (!tableRows.length) {
    return (
      <div className="rounded-lg border border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
        Sin datos para los filtros seleccionados
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-700 text-white">
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">AGRUPADOR</th>
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">UNIFICADOR DE PUESTOS</th>
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">{level3Label}</th>
            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" colSpan={situaciones.length + 1}>
              SITUACIÓN DE REVISTA
            </th>
          </tr>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 border-b border-r border-gray-200" />
            <th className="px-3 py-2 border-b border-r border-gray-200" />
            <th className="px-3 py-2 border-b border-r border-gray-200 min-w-[160px] sm:min-w-[200px]" />
            {situaciones.map(s => (
              <th key={s} className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-r border-gray-200">
                {s}
              </th>
            ))}
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-gray-200">
              Suma total
            </th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, idx) => {
            if (row.type === 'data') {
              return (
                <tr key={idx} className="bg-white">
                  {row.isFirstInAg && (
                    <td rowSpan={row.agSpan} className="px-3 py-1.5 align-middle text-xs font-semibold text-gray-900 border-b border-r border-gray-200 bg-gray-50 whitespace-nowrap">
                      {row.agrupador}
                    </td>
                  )}
                  {row.isFirstInUn && (
                    <td rowSpan={row.unSpan} className="px-3 py-1.5 align-middle text-xs text-gray-700 border-b border-r border-gray-200 whitespace-nowrap">
                      {row.unificador}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-xs text-gray-800 border-b border-r border-gray-100 whitespace-nowrap">
                    {row.level3}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-1.5 text-center border-b border-r border-gray-100">
                      <DrillCell
                        value={row.counts[s]}
                        onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador, level3: row.level3, situacion: s })}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center border-b border-gray-100">
                    <DrillCell
                      value={row.rowTotal}
                      onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador, level3: row.level3 })}
                      bold
                    />
                  </td>
                </tr>
              )
            }

            if (row.type === 'subtotal-un') {
              return (
                <tr key={idx} className="bg-gray-100">
                  <td colSpan={1} className="px-3 py-1.5 text-xs font-medium text-gray-700 border-b border-r border-gray-200 italic">
                    {row.label}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-1.5 text-center border-b border-r border-gray-200">
                      <DrillCell
                        value={row.counts[s]}
                        onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador, situacion: s })}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center border-b border-gray-200">
                    <DrillCell
                      value={row.rowTotal}
                      onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador })}
                      bold
                    />
                  </td>
                </tr>
              )
            }

            if (row.type === 'subtotal-ag') {
              return (
                <tr key={idx} className="bg-gray-300">
                  <td colSpan={2} className="px-3 py-2 text-xs font-bold text-gray-900 border-b border-r border-gray-400">
                    {row.label}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-2 text-center border-b border-r border-gray-400">
                      <DrillCell
                        value={row.counts[s]}
                        onClick={() => onDrill({ agrupador: row.agrupador, situacion: s })}
                        bold
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center border-b border-gray-400">
                    <DrillCell value={row.rowTotal} onClick={() => onDrill({ agrupador: row.agrupador })} bold />
                  </td>
                </tr>
              )
            }

            return null
          })}

          <tr className="bg-gray-700 text-white font-bold">
            <td colSpan={3} className="px-3 py-2 text-xs border-r border-gray-600">Suma total</td>
            {situaciones.map(s => (
              <td key={s} className="px-3 py-2 text-center border-r border-gray-600">
                <DrillCell value={grandTotals[s]} onClick={() => onDrill({ situacion: s })} bold />
              </td>
            ))}
            <td className="px-3 py-2 text-center">
              <DrillCell value={grandTotals.__grand} onClick={() => onDrill({})} bold />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
})
HierarchicalTable.displayName = 'HierarchicalTable'
