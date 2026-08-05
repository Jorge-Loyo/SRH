import { useState, useEffect } from 'react'
import { tableroApi } from '../../api/concursalesApi'
import { useAuth } from '../../auth/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { COLORES_ESTADO_CPH } from '../../utils/concursalesHelpers'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString('es-AR')

const ORDEN_SUB_ESTADOS = [
  'A-VALID. VCTE',
  'B-AUTORIZADO',
  'C-INSCRIPCION',
  'D-ETAPA EVAL',
  'E-ADJUDI',
  'F-PROX. A DESIG',
  'G-RESOLUCION',
  'H-DESIERTO',
  'FINALIZADO',
]

const NOMBRES_CODIGO_CEETPS = { 87: 'Enfermeros', 85: 'Técnicos', 83: 'Administrativos' }

// Colores para los tres tipos de registro CEETPS
const COLORES_CODIGO_CEETPS = {
  87: { bg: 'bg-emerald-50', border: 'border-emerald-200', num: 'text-emerald-900', title: 'text-emerald-600' },
  85: { bg: 'bg-sky-50',     border: 'border-sky-200',     num: 'text-sky-900',     title: 'text-sky-600' },
  83: { bg: 'bg-amber-50',   border: 'border-amber-200',   num: 'text-amber-900',   title: 'text-amber-600' },
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function MainBucket({ title, count, description, colorBg, colorBorder, colorNumber, colorTitle }) {
  return (
    <div className={`rounded-2xl border-2 ${colorBorder} ${colorBg} p-5 flex flex-col gap-2`}>
      <p className={`text-[11px] font-bold uppercase tracking-widest ${colorTitle}`}>{title}</p>
      <p className={`text-4xl font-extrabold leading-none ${colorNumber}`}>{fmt(count)}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

function EstadoCard({ code, count }) {
  const isEmpty = count === 0
  const colors = isEmpty
    ? { bg: '#FAFAFA', text: '#c0c0c0', ring: '#e8e8e8' }
    : (COLORES_ESTADO_CPH[code] ?? { bg: '#F5F5F5', text: '#9e9e9e', ring: '#e0e0e0' })
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-2 shadow-sm"
      style={{ backgroundColor: colors.bg, borderColor: colors.ring }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest leading-tight" style={{ color: colors.text }}>
        {code}
      </p>
      <p className="text-3xl font-extrabold leading-none" style={{ color: colors.text }}>{fmt(count)}</p>
    </div>
  )
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs text-gray-600 w-52 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{fmt(value)}</span>
    </div>
  )
}

function PouPofPair({ label, rows, keyField }) {
  const pou = rows.find(r => (r[keyField] ?? '').toUpperCase() === 'POU')?.total ?? 0
  const pof = rows.find(r => (r[keyField] ?? '').toUpperCase() === 'POF')?.total ?? 0
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-4">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-2">POU · Guardia</p>
          <p className="text-3xl font-extrabold text-blue-900">{fmt(pou)}</p>
        </div>
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 text-center">
          <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wider mb-2">POF · Planta</p>
          <p className="text-3xl font-extrabold text-violet-900">{fmt(pof)}</p>
        </div>
      </div>
    </div>
  )
}

function JefaturasPair({ label, rows, keyField, emptyMsg }) {
  const pou = rows.find(r => (r[keyField] ?? '').toUpperCase() === 'POU')?.total ?? 0
  const pof = rows.find(r => (r[keyField] ?? '').toUpperCase() === 'POF')?.total ?? 0
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-4">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      {rows.length === 0
        ? <p className="text-sm text-gray-400">{emptyMsg}</p>
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
              <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-2">POU · Guardia</p>
              <p className="text-3xl font-extrabold text-blue-900">{fmt(pou)}</p>
            </div>
            <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 text-center">
              <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wider mb-2">POF · Planta</p>
              <p className="text-3xl font-extrabold text-violet-900">{fmt(pof)}</p>
            </div>
          </div>
        )
      }
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className="pt-8">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function SiglaFilter({ siglas, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500">Sigla</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      >
        <option value="">Todas</option>
        {siglas.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  )
}

function BoardError({ message, onRetry }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center space-y-3">
        <p className="text-sm text-red-600">{message}</p>
        <button onClick={onRetry} className="btn-secondary text-sm mx-auto flex items-center gap-1.5">
          <ArrowPathIcon className="w-4 h-4" /> Reintentar
        </button>
      </div>
    </div>
  )
}

// ─── Tablero CPH ─────────────────────────────────────────────────────────────

function TableroCph() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [sigla, setSigla]     = useState('')

  async function load(s) {
    setLoading(true); setError(null)
    try   { setData(await tableroApi.getKpis(s || null)) }
    catch (e) { setError(e.message) }
    finally   { setLoading(false) }
  }

  useEffect(() => { load(null) }, [])

  function handleSiglaChange(s) { setSigla(s); load(s || null) }

  if (loading && !data) return <div className="flex items-center justify-center min-h-[40vh]"><Spinner /></div>
  if (error && !data)   return <BoardError message={error} onRetry={() => load(sigla || null)} />

  const { totales, seguimiento, bajas, siglasDisponibles = [] } = data
  const maxBajaMotivo = Math.max(1, ...bajas.porMotivo.map(r => r.total))

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <SiglaFilter siglas={siglasDisponibles} value={sigla} onChange={handleSiglaChange} />
        <button
          onClick={() => load(sigla || null)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Subtítulo con totales */}
      <p className="text-xs text-gray-500 mb-5">
        Total de bajas ingresadas al sistema:{' '}
        <strong className="text-gray-700">{fmt(totales.total_bajas)}</strong>
        {sigla && <span className="ml-2 text-indigo-600 font-medium">· Sigla: {sigla}</span>}
      </p>

      {/* ══ 1. Los dos grandes grupos ══════════════════════════════════════════ */}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Las bajas se dividen en dos grupos
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MainBucket
          title="Bajas que generan concurso"
          count={totales.total_seguimiento}
          description="Cumplen la regla CPH e inician un proceso concursal. Se gestionan en la pantalla Seguimiento CPH."
          colorBg="bg-indigo-50"
          colorBorder="border-indigo-200"
          colorNumber="text-indigo-900"
          colorTitle="text-indigo-500"
        />
        <MainBucket
          title="Bajas que no generan concurso"
          count={totales.bajas_sin_concurso}
          description="No inician proceso concursal (jubilaciones, renuncias sin cobertura, etc.). Solo figuran en Bajas Consolidadas."
          colorBg="bg-orange-50"
          colorBorder="border-orange-200"
          colorNumber="text-orange-900"
          colorTitle="text-orange-500"
        />
      </div>

      {/* ══ 2. Sub-estados ═════════════════════════════════════════════════════ */}
      <Section
        title="¿En qué etapa del proceso concursal está cada baja?"
        subtitle={`Solo aplica a las ${fmt(totales.total_seguimiento)} bajas que generan concurso (Seguimiento CPH).`}
      >
        {(() => {
          const porCodigo = Object.fromEntries(
            seguimiento.porSubEstado.map(r => [r.sub_estado, r.total])
          )
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ORDEN_SUB_ESTADOS.map(code => (
                <EstadoCard key={code} code={code} count={porCodigo[code] ?? 0} />
              ))}
            </div>
          )
        })()}
      </Section>

      {/* ══ 3. POU / POF ═══════════════════════════════════════════════════════ */}
      <Section
        title="¿Cuántos concursos son POU (guardia) y cuántos son POF (planta)?"
        subtitle="Concursos en Seguimiento CPH clasificados por tipo de puesto."
      >
        <PouPofPair label="En Seguimiento CPH" rows={seguimiento.porPouPof} keyField="escalafon" />
      </Section>

      {/* ══ 4. Jefaturas ═══════════════════════════════════════════════════════ */}
      <Section
        title="Concursos de Jefaturas — diferenciados por POU y POF"
        subtitle={`Registros con puesto de Jefatura en Seguimiento CPH. Total: ${fmt(totales.seg_jefaturas_total)}.`}
      >
        <JefaturasPair
          label="Jefaturas en Seguimiento CPH"
          rows={seguimiento.jefaturas}
          keyField="escalafon"
          emptyMsg="No hay concursos de jefaturas en seguimiento aún."
        />
      </Section>

      {/* ══ 5. Motivo de baja ══════════════════════════════════════════════════ */}
      <Section
        title="¿Por qué motivo se produjeron las bajas?"
        subtitle="Desglose por motivo de todas las bajas registradas en Bajas Consolidadas."
      >
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm divide-y divide-gray-50">
          {bajas.porMotivo.length === 0
            ? <p className="text-sm text-gray-400">Sin datos cargados aún.</p>
            : bajas.porMotivo.map(r => (
              <BarRow key={r.motivo_baja} label={r.motivo_baja} value={r.total} max={maxBajaMotivo} color="#6366f1" />
            ))
          }
        </div>
      </Section>
    </div>
  )
}

// ─── Tablero CEETPS ───────────────────────────────────────────────────────────

function TableroCeetps() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [sigla, setSigla]     = useState('')

  async function load(s) {
    setLoading(true); setError(null)
    try   { setData(await tableroApi.getKpisCeetps(s || null)) }
    catch (e) { setError(e.message) }
    finally   { setLoading(false) }
  }

  useEffect(() => { load(null) }, [])

  function handleSiglaChange(s) { setSigla(s); load(s || null) }

  if (loading && !data) return <div className="flex items-center justify-center min-h-[40vh]"><Spinner /></div>
  if (error && !data)   return <BoardError message={error} onRetry={() => load(sigla || null)} />

  const { totales, ceetps, siglasDisponibles = [] } = data
  const maxEstado  = Math.max(1, ...ceetps.porEstado.map(r => r.total))
  const maxMotivo  = Math.max(1, ...ceetps.porMotivo.map(r => r.total))

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <SiglaFilter siglas={siglasDisponibles} value={sigla} onChange={handleSiglaChange} />
        <button
          onClick={() => load(sigla || null)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Subtítulo */}
      <p className="text-xs text-gray-500 mb-5">
        Total de bajas ingresadas en Seguimiento CEETPS:{' '}
        <strong className="text-gray-700">{fmt(totales.total_ceetps)}</strong>
        {sigla && <span className="ml-2 text-teal-600 font-medium">· Sigla: {sigla}</span>}
      </p>

      {/* ══ 1. Bajas con / sin concurso iniciado ══════════════════════════════ */}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Las bajas CEETPS se dividen en dos grupos
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MainBucket
          title="Bajas que generan concurso CEETPS"
          count={totales.con_concurso}
          description="Tienen expediente de concurso iniciado. Se gestionan en Seguimiento CEETPS."
          colorBg="bg-teal-50"
          colorBorder="border-teal-200"
          colorNumber="text-teal-900"
          colorTitle="text-teal-600"
        />
        <MainBucket
          title="Bajas sin concurso iniciado"
          count={totales.sin_concurso}
          description="No tienen expediente de concurso cargado aún. Figuran en Seguimiento CEETPS sin iniciar."
          colorBg="bg-orange-50"
          colorBorder="border-orange-200"
          colorNumber="text-orange-900"
          colorTitle="text-orange-500"
        />
      </div>

      {/* ══ 2. Por tipo de registro (87 / 85 / 83) ═════════════════════════════ */}
      <Section
        title="Distribución por tipo de registro"
        subtitle="Clasificación según código CEETPS: 87 Enfermeros, 85 Técnicos, 83 Administrativos."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[87, 85, 83].map(cod => {
            const row = ceetps.porCodigo.find(r => r.codigo_registro === cod)
            const c   = COLORES_CODIGO_CEETPS[cod]
            return (
              <div key={cod} className={`rounded-2xl border-2 ${c.border} ${c.bg} p-5 flex flex-col gap-2`}>
                <p className={`text-[11px] font-bold uppercase tracking-widest ${c.title}`}>
                  {NOMBRES_CODIGO_CEETPS[cod]}
                </p>
                <p className={`text-4xl font-extrabold leading-none ${c.num}`}>{fmt(row?.total ?? 0)}</p>
                <p className="text-xs text-gray-500">Código {cod}</p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ══ 3. Estado del concurso ═════════════════════════════════════════════ */}
      <Section
        title="Estado del concurso"
        subtitle="Distribución de registros CEETPS por estado actual del concurso."
      >
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm divide-y divide-gray-50">
          {ceetps.porEstado.length === 0
            ? <p className="text-sm text-gray-400">Sin datos de estado cargados aún.</p>
            : ceetps.porEstado.map(r => (
              <BarRow key={r.estado_concurso} label={r.estado_concurso} value={r.total} max={maxEstado} color="#0d9488" />
            ))
          }
        </div>
      </Section>

      {/* ══ 4. Motivo de baja ══════════════════════════════════════════════════ */}
      <Section
        title="¿Por qué motivo se produjeron las bajas?"
        subtitle="Desglose por motivo de los registros CEETPS."
      >
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm divide-y divide-gray-50">
          {ceetps.porMotivo.length === 0
            ? <p className="text-sm text-gray-400">Sin datos cargados aún.</p>
            : ceetps.porMotivo.map(r => (
              <BarRow key={r.motivo_baja} label={r.motivo_baja} value={r.total} max={maxMotivo} color="#f59e0b" />
            ))
          }
        </div>
      </Section>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function TableroPage() {
  const { user } = useAuth()
  const role = user?.role

  // admin, editor y viewer ven ambos tableros con tabs
  const showTabs     = ['admin', 'editor', 'viewer'].includes(role)
  const showCphOnly  = role === 'gerencia'
  const showCeetpsOnly = role === 'concursales'

  const [activeTab, setActiveTab] = useState('cph')

  const subtitleByRole = showCphOnly
    ? 'Vista consolidada · CPH'
    : showCeetpsOnly
    ? 'Vista consolidada · CEETPS'
    : 'Vista consolidada · CPH y CEETPS'

  return (
    <div className="pb-12 max-w-5xl">

      {/* Cabecera */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Tablero de Procesos Concursales</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitleByRole}</p>
      </div>

      {/* Tabs — solo para admin / editor / viewer */}
      {showTabs && (
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('cph')}
            className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'cph'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            CPH
          </button>
          <button
            onClick={() => setActiveTab('ceetps')}
            className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'ceetps'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            CEETPS
          </button>
        </div>
      )}

      {/* Contenido según rol */}
      {(showCphOnly    || (showTabs && activeTab === 'cph'))    && <TableroCph />}
      {(showCeetpsOnly || (showTabs && activeTab === 'ceetps')) && <TableroCeetps />}

    </div>
  )
}
