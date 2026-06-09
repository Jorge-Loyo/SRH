import React, { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { apiGet } from '../../api/client.js'
import Spinner from '../../components/ui/Spinner.jsx'

function MetricCard({ label, value, sub, color = 'text-primary-700', loading }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <>
          <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </>
      )}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const [m, setM] = useState({})
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === 'admin'
  const canSeePersonas = ['admin', 'editor', 'viewer', 'gerencia'].includes(user?.role)

  useEffect(() => {
    let canceled = false
    async function loadMetrics() {
      try {
        const calls = [
          apiGet('/api/concursos', { limit: 1, offset: 0 }),
          apiGet('/api/recorridas', { limit: 1, offset: 0 }),
        ]
        if (canSeePersonas) calls.push(apiGet('/api/personas', { limit: 1, offset: 0 }))
        if (isAdmin) {
          calls.push(apiGet('/api/audit', { pageSize: 1, page: 1 }))
          calls.push(apiGet('/api/users'))
        }

        const results = await Promise.allSettled(calls)
        if (canceled) return

        let idx = 0
        const concursos  = results[idx++]
        const recorridas = results[idx++]
        const personas   = canSeePersonas ? results[idx++] : null
        const audit      = isAdmin ? results[idx++] : null
        const users      = isAdmin ? results[idx++] : null

        setM({
          concursos:  concursos.status  === 'fulfilled' ? (concursos.value?.meta?.count  ?? concursos.value?.total)  : null,
          recorridas: recorridas.status === 'fulfilled' ? (recorridas.value?.meta?.count ?? recorridas.value?.total ?? recorridas.value?.rows?.length) : null,
          personas:   personas?.status  === 'fulfilled' ? (personas.value?.meta?.count   ?? personas.value?.total)   : null,
          auditTotal: audit?.status     === 'fulfilled' ? audit.value?.total              : null,
          usuarios:   users?.status     === 'fulfilled' ? (users.value?.data?.length ?? users.value?.total) : null,
        })
      } catch {
        /* silencioso */
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    loadMetrics()
    return () => { canceled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roleLabel = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
    gerencia: 'Gerencia',
    director: 'Director',
  }[user?.role] ?? user?.role

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Bienvenida */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Bienvenido, {user?.username ?? 'usuario'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {roleLabel} · Sistema de Dotación de RRHH
        </p>
      </div>

      {/* Métricas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumen del sistema</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Concursos"
            value={m.concursos?.toLocaleString('es-AR')}
            sub="Procesos registrados"
            loading={loading}
          />
          <MetricCard
            label="Recorridas"
            value={m.recorridas?.toLocaleString('es-AR')}
            sub="Recorridas y minutas"
            loading={loading}
            color="text-teal-600"
          />
          {canSeePersonas && (
            <MetricCard
              label="Personas"
              value={m.personas?.toLocaleString('es-AR')}
              sub="En el padrón"
              loading={loading}
              color="text-indigo-600"
            />
          )}
          {isAdmin && (
            <MetricCard
              label="Eventos de auditoría"
              value={m.auditTotal?.toLocaleString('es-AR')}
              sub="Total en el log"
              loading={loading}
              color="text-amber-600"
            />
          )}
          {isAdmin && (
            <MetricCard
              label="Usuarios"
              value={m.usuarios?.toLocaleString('es-AR')}
              sub="Cuentas registradas"
              loading={loading}
              color="text-violet-600"
            />
          )}
        </div>
      </div>
    </div>
  )
}
