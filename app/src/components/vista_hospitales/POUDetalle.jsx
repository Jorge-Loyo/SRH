import React, { useState, useEffect, useMemo } from 'react'
import { Box, H3, Text, Button, Table, TableHead, TableRow, TableCell, TableBody, Icon } from '@adminjs/design-system'
import { useCurrentAdmin } from 'adminjs'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'
import PeriodoSelector from '../reutilizables/periodo-selector'
import { hospitalsMap } from '../datos-comunes/hospitals-data'
import { getParam } from '../../utils/urlHelpers'

// Etiquetas legibles para las columnas de la tabla POU
const COLUMN_LABELS = {
  id:               'ID',
  periodo:          'Período',
  sigla:            'Sigla',
  descripcion_sigla: 'Descripción',
  perfil:           'Perfil',
  especialidad:     'Especialidad',
  dotacion_diaria:  'Dot. Diaria',
  dotacion_sem:     'Dot. Semanal',
  dotacion_total:   'Dot. Total',
  activos:          'Activos',
  tecnicos:         'Técnicos',
  vacantes:         'Vacantes',
}

// Columnas a mostrar (en orden)
const VISIBLE_COLUMNS = [
  'descripcion_sigla',
  'perfil',
  'especialidad',
  'dotacion_diaria',
  'dotacion_sem',
  'dotacion_total',
  'activos',
  'tecnicos',
  'vacantes',
]

const POUDetalle = () => {
  const hospital = getParam('hospital') || 'HGACA'
  const periodoInicial = getParam('periodo') || ''

  const [currentAdmin] = useCurrentAdmin()
  const [periodo, setPeriodo] = useState(periodoInicial)
  const [state, setState] = useState({ loading: true, rows: [], total: 0 })
  const { error, handleError, clearError } = useErrorHandler()

  const hospitalName = useMemo(() => {
    const entry = Object.values(hospitalsMap).flat().find(h => h.id === hospital)
    return entry?.name || hospital
  }, [hospital])

  // Cargar datos POU
  useEffect(() => {
    if (!periodo) {
      setState({ loading: false, rows: [], total: 0 })
      return
    }

    let cancelled = false
    setState(s => ({ ...s, loading: true }))
    clearError()

    fetch(`/api/pou?sigla=${encodeURIComponent(hospital)}&periodo=${encodeURIComponent(periodo)}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        setState({ loading: false, rows: data.data || [], total: data.meta?.count || 0 })
      })
      .catch(err => {
        if (cancelled) return
        setState({ loading: false, rows: [], total: 0 })
        handleError(err)
      })

    return () => { cancelled = true }
  }, [hospital, periodo])

  const handlePeriodoChange = (p) => {
    setPeriodo(p)
  }

  // Exportar a Excel — llama al backend, sin dynamic import
  const handleExport = () => {
    if (state.rows.length === 0) {
      alert('No hay datos para exportar')
      return
    }
    fetch(`/api/pou/export?sigla=${encodeURIComponent(hospital)}&periodo=${encodeURIComponent(periodo)}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(({ base64 }) => {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pou_${hospital}_${periodo}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(e => alert('Error al exportar: ' + (e?.message || e)))
  }

  return (
    <Box style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 32, maxWidth: 1400, margin: '0 auto' }}>
      <BackButton />
      <UserInfo />

      {/* ── Banda de título (oscura, solo texto) ─────────────────────────── */}
      <Box
        style={{
          background: '#1a2e44',
          borderRadius: '10px 10px 0 0',
          padding: '18px 28px 14px',
          marginTop: 12,
        }}
      >
        <H3 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>
          {hospitalName}
        </H3>
        <Text style={{ color: '#94a3b8', fontSize: 13, margin: '3px 0 0' }}>
          Planta de Ocupación de Unidades (POU)
        </Text>
      </Box>

      {/* ── Barra de controles (clara, sob la banda oscura) ───────────────── */}
      <Box
        mb="lg"
        style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* PeriodoSelector sobre fondo claro → label visible */}
        <Box style={{ minWidth: 220 }}>
          <PeriodoSelector
            hospital={hospital}
            periodo={periodo}
            onPeriodoChange={handlePeriodoChange}
            fetchUrl={`/api/pou/periodos?sigla=${encodeURIComponent(hospital)}`}
          />
        </Box>

        {/* Exportar — solo visible si hay datos */}
        {periodo && !state.loading && !error && state.rows.length > 0 && (
          <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {state.rows.length} registro{state.rows.length !== 1 ? 's' : ''}
            </Text>
            <Button
              onClick={handleExport}
              size="sm"
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '7px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Icon icon="Download" style={{ fontSize: 14 }} />
              Exportar Excel
            </Button>
          </Box>
        )}
      </Box>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <ErrorFallback
          error={error}
          onRetry={() => { clearError(); setPeriodo(p => p) }}
          componentName="POUDetalle"
        />
      )}

      {/* ── Sin período ───────────────────────────────────────────────────── */}
      {!periodo && !error && (
        <Box
          p="xxl"
          style={{
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 8,
            border: '2px dashed #cbd5e1',
          }}
        >
          <Icon icon="Calendar" style={{ fontSize: 36, color: '#94a3b8', marginBottom: 10 }} />
          <Text style={{ color: '#64748b', fontSize: 15, marginTop: 8 }}>
            Seleccioná un período para ver los datos POU del hospital.
          </Text>
        </Box>
      )}

      {/* ── Cargando ──────────────────────────────────────────────────────── */}
      {periodo && state.loading && !error && (
        <Box p="xxl" style={{ textAlign: 'center' }}>
          <Text style={{ color: '#64748b', fontSize: 14 }}>Cargando datos POU…</Text>
        </Box>
      )}

      {/* ── Sin datos ─────────────────────────────────────────────────────── */}
      {periodo && !state.loading && !error && state.rows.length === 0 && (
        <Box
          p="xxl"
          style={{
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          <Icon icon="Search" style={{ fontSize: 36, color: '#94a3b8', marginBottom: 10 }} />
          <Text style={{ color: '#64748b', fontSize: 15, marginTop: 8 }}>
            No hay datos POU para <strong>{hospital}</strong> en el período <strong>{periodo}</strong>.
          </Text>
        </Box>
      )}

      {/* ── Tabla ─────────────────────────────────────────────────────────── */}
      {periodo && !state.loading && !error && state.rows.length > 0 && (
        <Box style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <Table>
            <TableHead>
              <TableRow>
                {VISIBLE_COLUMNS.map(col => (
                  <TableCell
                    key={col}
                    style={{
                      background: '#F3F4F6',
                      color: '#1F2937',
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '11px 16px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #D1D5DB',
                      position: 'sticky',
                      top: 0,
                    }}
                  >
                    {COLUMN_LABELS[col] || col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {state.rows.map((row, idx) => (
                <TableRow
                  key={`${row.id}-${row.periodo}-${idx}`}
                  style={{ background: idx % 2 === 0 ? '#ffffff' : '#FAFBFC', transition: 'background 0.12s' }}
                >
                  {VISIBLE_COLUMNS.map(col => (
                    <TableCell
                      key={col}
                      style={{
                        fontSize: 13,
                        padding: '10px 16px',
                        color: '#374151',
                        borderBottom: '1px solid #E5E7EB',
                        whiteSpace: col === 'descripcion_sigla' || col === 'especialidad' ? 'normal' : 'nowrap',
                      }}
                    >
                      {row[col] != null ? String(row[col]) : <span style={{ color: '#9CA3AF' }}>—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  )
}

export default POUDetalle
