import React, { useState, useEffect, useMemo } from 'react'
import { Box, H3, Text, Button, Table, TableHead, TableRow, TableCell, TableBody, Icon } from '@adminjs/design-system'
import { ApiClient, useCurrentAdmin } from 'adminjs'
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

  const api = useMemo(() => new ApiClient(), [])

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

    const params = { hospital, periodo }

    const call = typeof api.getPage === 'function'
      ? api.getPage({ pageName: 'POUDetalle', params })
      : api.request({ method: 'GET', url: 'pages/POUDetalle', params })

    call
      .then(res => {
        if (cancelled) return
        const data = res?.data || res || {}
        setState({ loading: false, rows: data.rows || [], total: data.total || 0 })
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

  // Exportar a Excel
  const handleExport = async () => {
    if (state.rows.length === 0) {
      alert('No hay datos para exportar')
      return
    }
    try {
      const { toExcelBase64 } = await import('../../utils/excel').catch(() => null) || {}
      if (!toExcelBase64) {
        // Fallback: CSV simple
        const cols = VISIBLE_COLUMNS
        const lines = [
          cols.map(c => COLUMN_LABELS[c] || c).join(','),
          ...state.rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))
        ]
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pou_${hospital}_${periodo}.csv`
        a.click()
        URL.revokeObjectURL(url)
        return
      }
      const b64 = await toExcelBase64(state.rows, VISIBLE_COLUMNS, {
        filters: { 'Hospital': hospital, 'Período': periodo }
      })
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pou_${hospital}_${periodo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al exportar: ' + (e?.message || e))
    }
  }

  return (
    <Box padding="xl" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Box mb="lg">
        <BackButton label="Volver" />
        <UserInfo />
      </Box>

      {/* Título + PeriodoSelector */}
      <Box
        mb="xl"
        style={{
          background: '#1a2e44',
          borderRadius: 10,
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Box>
          <H3 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>
            {hospital} — Planta de Ocupación de Unidades (POU)
          </H3>
          <Text style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            {hospitalName}
          </Text>
        </Box>
        <Box style={{ minWidth: 220 }}>
          <PeriodoSelector
            hospital={hospital}
            periodo={periodo}
            onPeriodoChange={handlePeriodoChange}
          />
        </Box>
      </Box>

      {/* Errores */}
      {error && (
        <ErrorFallback
          error={error}
          onRetry={() => {
            clearError()
            setPeriodo(p => p)
          }}
          componentName="POUDetalle"
        />
      )}

      {/* Sin periodo */}
      {!periodo && !error && (
        <Box mt="xl" style={{ textAlign: 'center' }}>
          <Text style={{ color: '#64748b', fontSize: 15 }}>
            Seleccioná un período para ver los datos POU del hospital.
          </Text>
        </Box>
      )}

      {/* Cargando */}
      {periodo && state.loading && (
        <Box mt="xl" style={{ textAlign: 'center' }}>
          <Text style={{ color: '#64748b' }}>Cargando datos POU...</Text>
        </Box>
      )}

      {/* Sin datos */}
      {periodo && !state.loading && !error && state.rows.length === 0 && (
        <Box
          mt="xl"
          p="xl"
          style={{
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          <Icon icon="Info" style={{ fontSize: 32, color: '#94a3b8', marginBottom: 12 }} />
          <Text style={{ color: '#64748b', fontSize: 15 }}>
            No hay datos POU para {hospital} — período {periodo}.
          </Text>
        </Box>
      )}

      {/* Tabla de datos */}
      {periodo && !state.loading && !error && state.rows.length > 0 && (
        <>
          {/* Barra superior: total + exportar */}
          <Box
            mb="md"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Text style={{ color: '#475569', fontSize: 14 }}>
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
                padding: '6px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
              }}
            >
              <Icon icon="Download" style={{ fontSize: 14 }} />
              Exportar Excel
            </Button>
          </Box>

          {/* Tabla */}
          <Box style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {VISIBLE_COLUMNS.map(col => (
                    <TableCell
                      key={col}
                      style={{
                        background: '#1a2e44',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '10px 14px',
                        whiteSpace: 'nowrap',
                        borderBottom: '2px solid #334155',
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
                    style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}
                  >
                    {VISIBLE_COLUMNS.map(col => (
                      <TableCell
                        key={col}
                        style={{
                          fontSize: 13,
                          padding: '8px 14px',
                          color: '#334155',
                          borderBottom: '1px solid #e2e8f0',
                          whiteSpace: col === 'descripcion_sigla' || col === 'especialidad' ? 'normal' : 'nowrap',
                        }}
                      >
                        {row[col] != null ? String(row[col]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Box>
  )
}

export default POUDetalle
