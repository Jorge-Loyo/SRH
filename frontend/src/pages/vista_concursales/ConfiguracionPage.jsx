import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { configApi } from '../../api/concursalesApi'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  CAMPOS_DISPONIBLES,
  GRUPOS_CAMPOS,
} from '../../utils/conjuntosRules'
import {
  CAMPOS_DISPONIBLES_CEETPS,
  GRUPOS_CAMPOS_CEETPS,
} from '../../utils/conjuntosRulesCeetps'

// ─── Contexto de campos (CPH o CEETPS según tab activo) ──────────────────────

const CamposCtx = createContext({ campos: [], grupos: [] })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ─── Constantes de UI ─────────────────────────────────────────────────────────

const ALL_OPERATORS = {
  '=':  'es igual a',
  '!=': 'es distinto de',
  '>':  'es mayor que',
  '<':  'es menor que',
  '>=': 'es mayor o igual a',
  '<=': 'es menor o igual a',
}

const BASIC_OPERATORS = { '=': ALL_OPERATORS['='], '!=': ALL_OPERATORS['!='] }

const LOGICAL_LABELS = {
  'AND':     'Y además',
  'OR':      'O bien',
  'AND NOT': 'Y no',
  'OR NOT':  'O no',
}

const LOGICAL_HELP = [
  { label: 'Y además',  desc: 'Ambas condiciones deben cumplirse (AND)' },
  { label: 'O bien',    desc: 'Basta con que se cumpla alguna de las dos (OR)' },
  { label: 'Y no',      desc: 'La anterior se cumple y esta NO debe cumplirse (AND NOT)' },
  { label: 'O no',      desc: 'La anterior se cumple, o bien esta NO se cumple (OR NOT)' },
]

function isComparableField(fieldKey, campos) {
  const def = campos.find(c => c.key === fieldKey)
  return def?.type === 'date' || def?.type === 'number'
}

// ─── Modal de selección de campo ──────────────────────────────────────────────

function FieldPickerModal({ selectedField, onSelect, onClose }) {
  const { campos, grupos } = useContext(CamposCtx)
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = search.toLowerCase().trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">Elegir campo</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar campo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input text-xs w-full pl-8"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
          {grupos.map(grupo => {
            const camposFiltrados = campos.filter(
              c => c.group === grupo && (!q || c.label.toLowerCase().includes(q))
            )
            if (!camposFiltrados.length) return null
            return (
              <div key={grupo}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{grupo}</p>
                <div className="flex flex-wrap gap-1.5">
                  {camposFiltrados.map(campo => (
                    <button
                      key={campo.key}
                      type="button"
                      onClick={() => { onSelect(campo); onClose() }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedField === campo.key
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700'
                      }`}
                    >
                      {campo.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Input de valor según tipo de campo ──────────────────────────────────────

function ValueInput({ fieldKey, value, onChange }) {
  const { campos } = useContext(CamposCtx)
  const def          = campos.find(c => c.key === fieldKey)
  const fieldType    = def?.type ?? 'enum'
  const fieldOptions = def?.options ?? []
  const optionLabels = def?.optionLabels ?? null

  if (fieldType === 'enum' || fieldType === 'boolean') {
    return (
      <select value={value} onChange={onChange} className="form-input text-xs flex-1 min-w-[160px]">
        {fieldOptions.map(o => (
          <option key={o} value={o}>{optionLabels ? (optionLabels[o] ?? o) : o}</option>
        ))}
      </select>
    )
  }

  if (fieldType === 'date') {
    return (
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="dd-mm-aaaa"
        className="form-input text-xs flex-1 min-w-[160px] font-mono"
      />
    )
  }

  if (fieldType === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder="0"
        className="form-input text-xs w-28 shrink-0"
      />
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Valor..."
      className="form-input text-xs flex-1 min-w-[160px]"
    />
  )
}

// ─── Fila de condición ────────────────────────────────────────────────────────

function ConditionRow({ cond, isFirst, onChange, onRemove }) {
  const { campos } = useContext(CamposCtx)
  const [showPicker, setShowPicker] = useState(false)

  const selectedField = campos.find(c => c.key === cond.field)
  const comparable    = isComparableField(cond.field, campos)
  const operators     = comparable ? ALL_OPERATORS : BASIC_OPERATORS

  function handleFieldSelect(campo) {
    const newOptions   = campo.options ?? []
    const defaultValue = newOptions[0] ?? ''
    const newIsComparable = campo.type === 'date' || campo.type === 'number'
    const newOperator = (!newIsComparable && !['=', '!='].includes(cond.operator)) ? '=' : cond.operator
    onChange({ ...cond, field: campo.key, operator: newOperator, value: defaultValue })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!isFirst && (
        <select
          value={cond.logicalOp ?? 'AND'}
          onChange={e => onChange({ ...cond, logicalOp: e.target.value })}
          className="form-input text-xs font-semibold text-primary-700 w-32 shrink-0"
        >
          {Object.entries(LOGICAL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      )}
      {isFirst && (
        <span className="text-xs font-semibold text-gray-500 w-32 shrink-0 pl-1">Si...</span>
      )}

      <button
        type="button"
        onClick={() => setShowPicker(true)}
        title="Elegir campo"
        className="form-input text-xs w-48 shrink-0 text-left truncate cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
      >
        {selectedField?.label ?? 'Elegir campo...'}
      </button>

      {showPicker && (
        <FieldPickerModal
          selectedField={cond.field}
          onSelect={handleFieldSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

      <select
        value={cond.operator}
        onChange={e => onChange({ ...cond, operator: e.target.value })}
        className="form-input text-xs w-44 shrink-0"
      >
        {Object.entries(operators).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      <ValueInput
        fieldKey={cond.field}
        value={cond.value}
        onChange={e => onChange({ ...cond, value: e.target.value })}
      />

      <button
        type="button"
        onClick={onRemove}
        title="Eliminar condición"
        className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Leyenda de operadores lógicos ────────────────────────────────────────────

function LeyendaLogica() {
  const [open, setOpen] = useState(false)

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-primary-600 transition-colors"
      >
        <InformationCircleIcon className="w-3.5 h-3.5" />
        ¿Qué significa cada conector?
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 divide-y divide-gray-100 text-[11px]">
          {LOGICAL_HELP.map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-3 px-3 py-2">
              <span className="font-semibold text-primary-700 w-16 shrink-0">{label}</span>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de regla ─────────────────────────────────────────────────────────

function RuleCard({ rule, index, onChange, onRemove, readOnly = false, resultLabel }) {
  const { campos } = useContext(CamposCtx)

  function makeEmptyCondition(logicalOp = null) {
    const firstField = campos[0]
    return {
      id: uid(),
      logicalOp,
      field: firstField.key,
      operator: '=',
      value: firstField.options?.[0] ?? '',
    }
  }

  function updateCondition(condId, updated) {
    onChange({ ...rule, conditions: rule.conditions.map(c => c.id === condId ? updated : c) })
  }

  function addCondition() {
    onChange({ ...rule, conditions: [...rule.conditions, makeEmptyCondition('AND')] })
  }

  function removeCondition(condId) {
    const next = rule.conditions.filter(c => c.id !== condId)
    if (next.length > 0) next[0] = { ...next[0], logicalOp: null }
    onChange({ ...rule, conditions: next.length > 0 ? next : [makeEmptyCondition(null)] })
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Regla {index + 1}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Eliminar regla
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-2.5">
        {rule.conditions.map((cond, ci) => (
          <ConditionRow
            key={cond.id}
            cond={cond}
            isFirst={ci === 0}
            onChange={readOnly ? null : updated => updateCondition(cond.id, updated)}
            onRemove={readOnly ? null : () => removeCondition(cond.id)}
          />
        ))}

        {!readOnly && (
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={addCondition}
              className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Agregar condición
            </button>
            {rule.conditions.length > 1 && <LeyendaLogica />}
          </div>
        )}
        {readOnly && rule.conditions.length > 1 && (
          <div className="flex justify-end pt-1"><LeyendaLogica /></div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium shrink-0">Entonces</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 shrink-0 w-36">{resultLabel} =</span>
          <input
            type="text"
            value={rule.result}
            onChange={readOnly ? undefined : e => onChange({ ...rule, result: e.target.value })}
            readOnly={readOnly}
            placeholder="Ej: Conjunto A, Conjunto 1..."
            maxLength={200}
            className={`form-input text-sm flex-1 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Sección de conjuntos (reutilizable para CPH y CEETPS) ───────────────────

function ConfigSection({ getConfig, saveConfig, campos, grupos, title, description, resultLabel, canEdit }) {
  const [rules, setRules]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    getConfig()
      .then(data => setRules(data.rules ?? []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function makeEmptyCondition(logicalOp = null) {
    const firstField = campos[0]
    return { id: uid(), logicalOp, field: firstField.key, operator: '=', value: firstField.options?.[0] ?? '' }
  }

  function makeEmptyRule() {
    return { id: uid(), conditions: [makeEmptyCondition(null)], result: '' }
  }

  const updateRule = useCallback((ruleId, updated) => {
    setRules(prev => prev.map(r => r.id === ruleId ? updated : r))
    setSaved(false)
  }, [])

  const removeRule = useCallback((ruleId) => {
    setRules(prev => prev.filter(r => r.id !== ruleId))
    setSaved(false)
  }, [])

  const addRule = () => {
    setRules(prev => [...prev, makeEmptyRule()])
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false)
    try {
      await saveConfig(rules)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <CamposCtx.Provider value={{ campos, grupos }}>
      <div className="space-y-4">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5 max-w-xl">{description}</p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={addRule}
              className="btn-primary inline-flex items-center gap-1.5 shrink-0 text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Nueva regla
            </button>
          )}
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-gray-400">Cargando configuración...</div>
        )}

        {!loading && rules.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-sm text-gray-400">No hay reglas configuradas.</p>
          </div>
        )}

        {!loading && rules.length > 0 && (
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={i}
                onChange={updated => updateRule(rule.id, updated)}
                onRemove={() => removeRule(rule.id)}
                readOnly={!canEdit}
                resultLabel={resultLabel}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">
            {error}
          </div>
        )}

        {!loading && canEdit && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckIcon className="w-4 h-4" />
                Guardado
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}

      </div>
    </CamposCtx.Provider>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const CONFIG_WRITE_ROLES = ['admin', 'editor']

export default function ConfiguracionPage() {
  const { user } = useAuth()
  const canEdit = CONFIG_WRITE_ROLES.includes(user?.role)

  const [activeTab, setActiveTab] = useState('cph')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-1">Procesos Concursales</p>
        </div>

        {/* Tabs CPH / CEETPS */}
        <div className="flex border-b border-gray-200">
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

        {/* Sección CPH */}
        {activeTab === 'cph' && (
          <ConfigSection
            getConfig={configApi.getConjuntos}
            saveConfig={configApi.saveConjuntos}
            campos={CAMPOS_DISPONIBLES}
            grupos={GRUPOS_CAMPOS}
            title="Conjuntos CPH — Reglas de autocompletado"
            description={`Definí reglas para que el campo Conjuntos del formulario Seguimiento CPH se complete automáticamente. Se evalúan de arriba a abajo y la primera regla que coincida es la que aplica. El campo sigue siendo editable.`}
            resultLabel="Conjuntos CPH"
            canEdit={canEdit}
          />
        )}

        {/* Sección CEETPS */}
        {activeTab === 'ceetps' && (
          <ConfigSection
            getConfig={configApi.getConjuntosCeetps}
            saveConfig={configApi.saveConjuntosCeetps}
            campos={CAMPOS_DISPONIBLES_CEETPS}
            grupos={GRUPOS_CAMPOS_CEETPS}
            title="Conjuntos CEETPS — Reglas de autocompletado"
            description={`Definí reglas para que el campo Conjuntos del formulario Seguimiento CEETPS se complete automáticamente. Se evalúan de arriba a abajo y la primera regla que coincida es la que aplica. El campo sigue siendo editable.`}
            resultLabel="Conjuntos CEETPS"
            canEdit={canEdit}
          />
        )}

      </div>
    </div>
  )
}
