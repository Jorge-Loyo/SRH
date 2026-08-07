import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, useReactFlow,
  ReactFlowProvider, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import * as XLSX from 'xlsx'
import { apiGet } from '../../api/client'
import { XMarkIcon, TableCellsIcon, ArrowDownTrayIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline'

// ─── Colores por grupo ────────────────────────────────────────────────────────
const TABLE_COLORS = {
  new_cargo:         '#6366f1',
  carreras:          '#8b5cf6',
  modalidades:       '#8b5cf6',
  especialidades:    '#8b5cf6',
  puestos_tec:       '#8b5cf6',
  situacion_revista: '#8b5cf6',
  cargos_alta:       '#0ea5e9',
  registro_cph:      '#0ea5e9',
  registro_enf:      '#0ea5e9',
  registro_tec_pou:  '#0ea5e9',
  registro_tec_pof:  '#0ea5e9',
  personas:          '#10b981',
  cargos:            '#10b981',
  roles:             '#10b981',
  siglas:            '#f59e0b',
  users:             '#ef4444',
  refresh_tokens:    '#ef4444',
  audit_logs:        '#ef4444',
  permissions:       '#ef4444',
  default:           '#64748b',
}
const tableColor = name => TABLE_COLORS[name] || TABLE_COLORS.default

// ─── Modal contenido de tabla ────────────────────────────────────────────────
function TableDataModal({ tableName, onClose }) {
  const [data,    setData]    = useState(null)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const LIMIT = 50

  useEffect(() => {
    setLoading(true)
    apiGet(`/api/herramientas/table/${tableName}`, { page, limit: LIMIT })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [tableName, page])

  async function handleExport() {
    try {
      // Traer todos los registros para el export
      const all = await apiGet(`/api/herramientas/table/${tableName}`, { page: 1, limit: 9999 })
      const rows = all.rows
      if (!rows.length) return
      const cols = Object.keys(rows[0])
      const ws = XLSX.utils.aoa_to_sheet([
        cols,
        ...rows.map(r => cols.map(c => r[c] ?? '')),
      ])
      ws['!cols'] = cols.map(() => ({ wch: 18 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, tableName.slice(0, 31))
      XLSX.writeFile(wb, `${tableName}.xlsx`)
    } catch (e) { console.error(e) }
  }

  const cols = data?.rows?.length ? Object.keys(data.rows[0]) : []
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '90vw', maxWidth: 1100, height: '80vh' }}
        onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <TableCellsIcon className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-800 text-sm">{tableName}</span>
            {data && <span className="text-xs text-gray-400">{data.total.toLocaleString('es-AR')} registros</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Exportar Excel
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          {loading && <p className="text-sm text-gray-400 text-center py-12">Cargando...</p>}
          {error   && <p className="text-sm text-red-500 text-center py-12">{error}</p>}
          {!loading && !error && data && (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  {cols.map(c => (
                    <th key={c} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}>
                    {cols.map(c => (
                      <td key={c} className="px-3 py-1.5 text-gray-700 whitespace-nowrap border-b border-gray-50 max-w-[200px] truncate">
                        {row[c] === null ? <span className="text-gray-300">NULL</span> : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-2 border-t border-gray-100 shrink-0">
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Nodo tabla ───────────────────────────────────────────────────────────────
function TableNode({ data }) {
  const { tableName, columns, color, dimmed, selected, onSelect, onView, onExport } = data
  const pks  = columns.filter(c => c.pk)
  const fks  = columns.filter(c => c.fk && !c.pk)
  const rest = columns.filter(c => !c.pk && !c.fk)

  return (
    <div
      onClick={() => onSelect(tableName)}
      className="rounded-lg overflow-hidden shadow-lg border-2 bg-white cursor-pointer transition-all"
      style={{
        fontSize: 11,
        minWidth: 220, maxWidth: 280,
        borderColor: selected ? color : '#e2e8f0',
        opacity: dimmed ? 0.25 : 1,
        boxShadow: selected ? `0 0 0 3px ${color}55, 0 4px 16px ${color}33` : undefined,
        transform: selected ? 'scale(1.03)' : undefined,
      }}>
      <Handle type="target" position={Position.Left}  style={{ background: '#16a34a', width: 8, height: 8, border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#16a34a', width: 8, height: 8, border: '2px solid #fff' }} />
      <Handle type="target" position={Position.Top}    style={{ background: '#16a34a', width: 8, height: 8, border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#16a34a', width: 8, height: 8, border: '2px solid #fff' }} />

      {/* Header con botones */}
      <div className="px-2 py-1.5 text-white font-bold text-xs tracking-wide flex items-center gap-1"
        style={{ background: dimmed ? '#94a3b8' : color }}>
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M3 14h18M10 4v16M14 4v16M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
        <span className="flex-1 truncate">{tableName}</span>
        {/* Botón ver contenido */}
        <button
          onClick={e => { e.stopPropagation(); onView(tableName) }}
          title="Ver contenido"
          className="p-0.5 rounded hover:bg-white/20 transition-colors shrink-0">
          <TableCellsIcon className="w-3.5 h-3.5" />
        </button>
        {/* Botón exportar Excel */}
        <button
          onClick={e => { e.stopPropagation(); onExport(tableName) }}
          title="Exportar Excel"
          className="p-0.5 rounded hover:bg-white/20 transition-colors shrink-0">
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      {pks.map(c => (
        <div key={c.name} className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border-b border-yellow-100">
          <span className="text-yellow-600 font-bold text-[9px] shrink-0">PK</span>
          <span className="font-semibold text-gray-800 truncate">{c.name}</span>
          <span className="ml-auto text-gray-400 text-[9px] shrink-0">{c.type}</span>
        </div>
      ))}
      {fks.map(c => (
        <div key={c.name} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border-b border-blue-100">
          <span className="text-blue-500 font-bold text-[9px] shrink-0">FK</span>
          <span className="text-gray-700 truncate">{c.name}</span>
          <span className="ml-auto text-gray-400 text-[9px] shrink-0">{c.type}</span>
        </div>
      ))}
      {rest.map(c => (
        <div key={c.name} className="flex items-center gap-1.5 px-3 py-1 border-b border-gray-50 last:border-0">
          <span className="text-gray-700 truncate">{c.name}</span>
          <span className="ml-auto text-gray-400 text-[9px] shrink-0">{c.type}</span>
        </div>
      ))}
    </div>
  )
}

const NODE_TYPES = { tableNode: TableNode }

// ─── Layout en grilla ─────────────────────────────────────────────────────────
function buildLayout(names) {
  const COLS = 5, COL_W = 320, ROW_H = 420
  const pos = {}
  names.forEach((n, i) => {
    pos[n] = { x: (i % COLS) * COL_W + 40, y: Math.floor(i / COLS) * ROW_H + 40 }
  })
  return pos
}

// ─── Layout radial para vista de selección ────────────────────────────────────
function buildRadialLayout(center, related) {
  const pos = {}
  pos[center] = { x: 0, y: 0 }
  const count = related.length
  related.forEach((name, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    const radius = count <= 4 ? 420 : count <= 8 ? 480 : 540
    pos[name] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  })
  return pos
}

// ─── Inner con acceso a useReactFlow ─────────────────────────────────────────
function ErdInner({ schema, tableNames }) {
  const { fitView } = useReactFlow()
  const containerRef = useRef(null)
  const [search,       setSearch]       = useState('')
  const [hiddenTables, setHiddenTables] = useState(new Set())
  const [selected,     setSelected]     = useState(null)
  const [viewTable,    setViewTable]    = useState(null)  // modal contenido
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Tablas relacionadas con la seleccionada (directo en ambas direcciones)
  const relatedTables = useMemo(() => {
    if (!selected || !schema) return new Set()
    const rel = new Set()
    schema.fks.forEach(fk => {
      if (fk.fromTable === selected) rel.add(fk.toTable)
      if (fk.toTable   === selected) rel.add(fk.fromTable)
    })
    return rel
  }, [selected, schema])

  const handleSelect = useCallback((name) => {
    setSelected(prev => prev === name ? null : name)
  }, [])

  const handleView = useCallback((name) => {
    setViewTable(name)
  }, [])

  const handleExport = useCallback(async (name) => {
    try {
      const all = await apiGet(`/api/herramientas/table/${name}`, { page: 1, limit: 9999 })
      const rows = all.rows
      if (!rows.length) return
      const cols = Object.keys(rows[0])
      const ws = XLSX.utils.aoa_to_sheet([cols, ...rows.map(r => cols.map(c => r[c] ?? ''))])
      ws['!cols'] = cols.map(() => ({ wch: 18 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
      XLSX.writeFile(wb, `${name}.xlsx`)
    } catch (e) { console.error(e) }
  }, [])

  // Reconstruir nodos y edges cuando cambia selección / visibilidad
  useEffect(() => {
    if (!schema) return

    const visibleNames = tableNames.filter(t =>
      !hiddenTables.has(t) &&
      (search === '' || t.toLowerCase().includes(search.toLowerCase()))
    )

    let positions
    if (selected && relatedTables.size > 0) {
      // Vista radial: centro + relacionadas
      const relVisible = [...relatedTables].filter(t => visibleNames.includes(t))
      positions = buildRadialLayout(selected, relVisible)
      // Las no relacionadas se ponen lejos (no se muestran en foco)
      visibleNames.forEach(n => { if (!positions[n]) positions[n] = { x: 9999, y: 9999 } })
    } else {
      positions = buildLayout(visibleNames)
    }

    const newNodes = visibleNames.map(name => {
      const isSelected = name === selected
      const isRelated  = relatedTables.has(name)
      const dimmed     = selected !== null && !isSelected && !isRelated
      return {
        id:   name,
        type: 'tableNode',
        position: positions[name] || { x: 0, y: 0 },
        data: {
          tableName: name,
          columns:   schema.tables[name] || [],
          color:     tableColor(name),
          selected:  isSelected,
          dimmed,
          onSelect:  handleSelect,
          onView:    handleView,
          onExport:  handleExport,
        },
      }
    })

    const newEdges = schema.fks
      .filter(fk => visibleNames.includes(fk.fromTable) && visibleNames.includes(fk.toTable))
      .map(fk => {
        const isActive = selected &&
          (fk.fromTable === selected || fk.toTable === selected)
        const dimmed = selected && !isActive
        return {
          id:     `${fk.fromTable}.${fk.fromColumn}->${fk.toTable}.${fk.toColumn}`,
          source: fk.fromTable,
          target: fk.toTable,
          type:   'smoothstep',
          label:  isActive ? `${fk.fromColumn} → ${fk.toColumn}` : undefined,
          labelStyle:   { fontSize: 10, fill: '#374151', fontWeight: 600 },
          labelBgStyle: { fill: '#fff', fillOpacity: 0.95 },
          labelBgPadding: [4, 2],
          style: {
            stroke:      dimmed ? '#e2e8f0' : isActive ? '#15803d' : '#16a34a',
            strokeWidth: isActive ? 3 : 2,
            opacity:     dimmed ? 0.15 : 1,
          },
          markerEnd: {
            type:   MarkerType.ArrowClosed,
            color:  dimmed ? '#e2e8f0' : '#15803d',
            width:  isActive ? 16 : 12,
            height: isActive ? 16 : 12,
          },
          animated: !!isActive,
          zIndex:   isActive ? 10 : 0,
        }
      })

    setNodes(newNodes)
    setEdges(newEdges)

    // Fit view enfocando solo las tablas relevantes
    setTimeout(() => {
      if (selected) {
        const focusIds = [selected, ...relatedTables].filter(t => visibleNames.includes(t))
        fitView({ nodes: focusIds.map(id => ({ id })), padding: 0.25, duration: 400 })
      } else {
        fitView({ padding: 0.12, duration: 300 })
      }
    }, 50)
  }, [schema, tableNames, hiddenTables, search, selected, relatedTables, handleSelect, setNodes, setEdges, fitView])

  function toggleTable(name) {
    setHiddenTables(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
    if (selected === name) setSelected(null)
  }

  const filteredList = tableNames.filter(t =>
    search === '' || t.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={containerRef} className="flex gap-3 bg-gray-50" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 80px)' }}>

      {viewTable && (
        <TableDataModal tableName={viewTable} onClose={() => setViewTable(null)} />
      )}

      {/* Panel lateral */}
      <div className="w-52 shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {tableNames.length} tablas · {schema.fks.length} relaciones
          </p>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar tablas..." className="form-input text-xs w-full" />
        </div>

        {/* Info de selección */}
        {selected && (
          <div className="px-3 py-2 border-b border-gray-100 bg-indigo-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-indigo-700 truncate">{selected}</span>
              <button onClick={() => setSelected(null)}
                className="p-0.5 rounded text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 shrink-0">
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-indigo-500">
              {relatedTables.size} tabla{relatedTables.size !== 1 ? 's' : ''} relacionada{relatedTables.size !== 1 ? 's' : ''}
            </p>
            {[...relatedTables].sort().map(t => (
              <button key={t} onClick={() => setSelected(t)}
                className="mt-0.5 w-full flex items-center gap-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 text-left">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tableColor(t) }} />
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 py-1">
          {filteredList.map(name => {
            const isSelected = name === selected
            const isRelated  = relatedTables.has(name)
            return (
              <button key={name}
                onClick={() => { if (!hiddenTables.has(name)) handleSelect(name) }}
                onContextMenu={e => { e.preventDefault(); toggleTable(name) }}
                title="Click: seleccionar · Click derecho: mostrar/ocultar"
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  hiddenTables.has(name)
                    ? 'text-gray-300 line-through'
                    : isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : isRelated
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                }`}>
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: hiddenTables.has(name) ? '#cbd5e1' : tableColor(name) }} />
                {name}
                {isRelated && !isSelected && (
                  <span className="ml-auto text-[9px] text-blue-400 shrink-0">↔</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="px-3 py-2 border-t border-gray-100 space-y-1">
          {selected && (
            <button onClick={() => setSelected(null)}
              className="w-full text-xs py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
              Limpiar selección
            </button>
          )}
          <div className="flex gap-1.5">
            <button onClick={() => setHiddenTables(new Set())}
              className="flex-1 text-xs py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100">
              Mostrar todo
            </button>
            <button onClick={() => setHiddenTables(new Set(tableNames))}
              className="flex-1 text-xs py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">
              Ocultar todo
            </button>
          </div>
          <p className="text-[9px] text-gray-300 text-center">Click derecho = ocultar/mostrar</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.05}
          maxZoom={2}
          onPaneClick={() => setSelected(null)}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls showFitView={false} />
          <MiniMap nodeColor={n => tableColor(n.id)}
            maskColor="rgba(255,255,255,0.7)"
            style={{ border: '1px solid #e2e8f0', borderRadius: 8 }} />
        </ReactFlow>
        {/* Botón fullscreen + fit */}
        <button
          onClick={() => {
            toggleFullscreen()
            setTimeout(() => {
              if (selected) {
                const focusIds = [selected, ...[...relatedTables]]
                fitView({ nodes: focusIds.map(id => ({ id })), padding: 0.25, duration: 400 })
              } else {
                fitView({ padding: 0.12, duration: 300 })
              }
            }, 150)
          }}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="absolute top-2 right-2 z-[9999] w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 text-gray-600"
        >
          {isFullscreen
            ? <ArrowsPointingInIcon className="w-3.5 h-3.5" />
            : <ArrowsPointingOutIcon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ─── Wrapper con Provider ─────────────────────────────────────────────────────
export default function TablasVistaPage() {
  const [schema,  setSchema]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    apiGet('/api/herramientas/erd')
      .then(data => { setSchema(data); setLoading(false) })
      .catch(e  => { setError(e.message); setLoading(false) })
  }, [])

  const tableNames = useMemo(() => schema ? Object.keys(schema.tables).sort() : [], [schema])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      Cargando esquema...
    </div>
  )
  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
  )

  return (
    <ReactFlowProvider>
      <ErdInner schema={schema} tableNames={tableNames} />
    </ReactFlowProvider>
  )
}
