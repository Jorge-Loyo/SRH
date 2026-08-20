import React, { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { DrawerShell } from './ui'

export default function HistoryDrawer({ open, onClose, loading, procesos, onLoad }) {
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (open) onLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const fmt = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <DrawerShell onClose={onClose} width="max-w-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <span className="font-semibold text-sm text-gray-900">Historial de procesos</span>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-xs text-gray-400 text-center py-8">Cargando...</p>}
        {!loading && !procesos.length && (
          <p className="text-xs text-gray-400 text-center py-8">Sin procesos guardados aún.</p>
        )}
        {procesos.map((p, i) => (
          <div key={p.proceso_id} className="border-b border-gray-50 last:border-0">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
            >
              <div>
                <p className="text-xs font-medium text-gray-700">{fmt(p.fecha)}</p>
                <div className="flex gap-3 mt-0.5">
                  {p.es_carga_inicial
                    ? <span className="text-[10px] text-gray-500">Carga inicial — {p.insertados} registros</span>
                    : (
                      <>
                        {p.insertados > 0 && <span className="text-[10px] text-green-600">+{p.insertados} nuevos</span>}
                        {p.registros_actualizados > 0 && <span className="text-[10px] text-blue-600">~{p.registros_actualizados} actualizados</span>}
                        {p.eliminados > 0 && <span className="text-[10px] text-red-500">-{p.eliminados} eliminados</span>}
                        {!p.insertados && !p.registros_actualizados && !p.eliminados && (
                          <span className="text-[10px] text-gray-400">Sin cambios</span>
                        )}
                      </>
                    )}
                </div>
              </div>
              <span className="text-gray-300 text-xs">{expanded === i ? '▲' : '▼'}</span>
            </button>
            {expanded === i && p.cambios?.length > 0 && (
              <div className="px-4 pb-3">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left py-1 pr-2">ID SIAL</th>
                      <th className="text-left py-1 pr-2">AYN</th>
                      <th className="text-left py-1 pr-2">Campo</th>
                      <th className="text-left py-1 pr-2">Antes</th>
                      <th className="text-left py-1">Después</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.cambios.slice(0, 50).map((c, j) => (
                      <tr key={j} className="border-t border-gray-50">
                        <td className="py-0.5 pr-2 text-gray-500">{c.id_sial}</td>
                        <td className="py-0.5 pr-2 text-gray-600 max-w-[100px] truncate">{c.ayn}</td>
                        <td className="py-0.5 pr-2 text-blue-500 font-medium">{c.campo}</td>
                        <td className="py-0.5 pr-2 text-red-400 max-w-[80px] truncate">{c.valor_anterior ?? '—'}</td>
                        <td className="py-0.5 text-green-600 max-w-[80px] truncate">{c.valor_nuevo ?? '—'}</td>
                      </tr>
                    ))}
                    {p.cambios.length > 50 && (
                      <tr><td colSpan={5} className="text-gray-400 py-1">... y {p.cambios.length - 50} cambios más</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </DrawerShell>
  )
}