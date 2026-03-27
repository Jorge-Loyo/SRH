import React, { useEffect } from 'react'
import { Box, H4, H3, Text } from '@adminjs/design-system'
import { normalizarEstado, getColorEstado } from '../../utils/concursosHelpers'
import { getErrorMessage } from '../../utils/httpErrorHandler'

const FieldRow = ({ label, value }) => (
  <Box style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 12, color: '#333', fontWeight: 700, margin: 0, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
      {label}
    </Text>
    <Text style={{ fontSize: 15, fontWeight: 500, wordWrap: 'break-word', color: '#222', lineHeight: '1.4' }}>
      {value || '-'}
    </Text>
  </Box>
)

const SectionTitle = ({ title, color = '#1976d2' }) => (
  <Box style={{ marginBottom: 20, marginTop: 0, paddingBottom: 12, borderBottom: `3px solid ${color}` }}>
    <H4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {title}
    </H4>
  </Box>
)

const ConcursosDetailModal = ({ record, onClose }) => {
  if (!record) return null

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const colorEstado = getColorEstado(record.sub_estado)

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxHeight: '95vh',
          overflowY: 'auto',
          maxWidth: '1200px',
          width: '95%',
        }}
      >
        {/* Encabezado */}
        <Box
          p="lg"
          style={{
            borderBottom: `3px solid ${colorEstado.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: `linear-gradient(135deg, ${colorEstado.bg} 0%, #fff 100%)`,
          }}
        >
          <Box>
            <H3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: colorEstado.text }}>
              Detalles del Concurso
            </H3>
            <Text style={{ margin: 0, fontSize: 13, color: '#666' }}>
              Hospital: <strong>{record.sigla}</strong>
            </Text>
          </Box>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              color: '#999',
              padding: '0 4px',
              lineHeight: 1,
              transition: 'color 200ms',
            }}
            onMouseEnter={(e) => (e.target.style.color = colorEstado.text)}
            onMouseLeave={(e) => (e.target.style.color = '#999')}
          >
            ✕
          </button>
        </Box>

        {/* Estado General - Resumen */}
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 20,
            padding: 20,
            background: '#f5f7fa',
            borderBottom: '2px solid #eee',
            textAlign: 'center',
          }}
        >
          <Box>
            <Text style={{ fontSize: 11, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Origen
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#388e3c', margin: '8px 0 0 0' }}>
              {record.origen || '-'}
            </Text>
          </Box>
          <Box>
            <Text style={{ fontSize: 11, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estado
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#1976d2', margin: '8px 0 0 0' }}>
              {record.estado || '-'}
            </Text>
          </Box>
          <Box>
            <Text style={{ fontSize: 11, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sub Estado
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color: colorEstado.text, margin: '8px 0 0 0' }}>
              {normalizarEstado(record.sub_estado) || '-'}
            </Text>
          </Box>
          <Box>
            <Text style={{ fontSize: 11, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Código de Cargo
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color: '#333', margin: '8px 0 0 0' }}>
              {record.codigo_cargo || '-'}
            </Text>
          </Box>
        </Box>

        {/* Contenido Principal - 3 Secciones */}
        <Box p="lg">
          {/* ============ SECCIÓN 1: BAJA ============ */}
          <Box style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24, border: '2px solid #ff6b6b' }}>
            <SectionTitle title="📋 EMPLEADO DE BAJA" color="#ff6b6b" />
            <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
              <FieldRow label="Nombre" value={record.nombre_baja} />
              <FieldRow label="CUIL" value={record.cuil_baja} />
              <FieldRow label="Expediente de Baja" value={record.ee_baja} />
              <FieldRow label="Fecha de Baja" value={record.fecha_baja} />
              <FieldRow label="Escalafón" value={record.escalafon_baja} />
              <FieldRow label="Puesto" value={record.puesto_baja} />
              <FieldRow label="Especialidad" value={record.especialidad_baja} />
            </Box>
          </Box>

          {/* ============ SECCIÓN 2: CONCURSO ============ */}
          <Box style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24, border: '2px solid #1976d2' }}>
            <SectionTitle title="🏆 PROCESO DEL CONCURSO" color="#1976d2" />

            {/* Subsección 2.1 */}
            <Box style={{ marginBottom: 24 }}>
              <H4 style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 700, color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Etapa 1: Convocatoria y Autorización
              </H4>
              <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, paddingLeft: 16, borderLeft: '3px solid #90caf9' }}>
                <FieldRow label="Expediente de Concurso" value={record.ee_concurso} />
                <FieldRow label="Fecha de Concurso" value={record.fecha_ee_concurso} />
                <FieldRow label="Escalafón" value={record.escalafon_concurso} />
                <FieldRow label="Puesto Solicitado" value={record.puesto_alta} />
                <FieldRow label="Especialidad Solicitada" value={record.especialidad_solicitada_de_alta} />
                <FieldRow label="Fecha de Autorización" value={record.fecha_autorizacion} />
                <FieldRow label="Sorteo de Jurado" value={record.sorteo_de_jurado ? 'Sí' : 'No'} />
              </Box>
            </Box>

            {/* Subsección 2.2 */}
            <Box>
              <H4 style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 700, color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Etapa 2: Inscripción y Evaluación
              </H4>
              <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, paddingLeft: 16, borderLeft: '3px solid #90caf9' }}>
                <FieldRow label="Disposición de Concurso" value={record.disposicion_concurso} />
                <FieldRow label="Fecha de Inscripción Desde" value={record.fecha_desde} />
                <FieldRow label="Fecha de Inscripción Hasta" value={record.fecha_hasta} />
                <FieldRow label="Fecha de Examen" value={record.fecha_examen} />
                <FieldRow label="Orden de Mérito" value={record.orden_merito} />
                <FieldRow label="Fecha de Orden de Mérito" value={record.fecha_orden_merito} />
              </Box>
            </Box>
          </Box>

          {/* ============ SECCIÓN 3: DESIGNACIÓN ============ */}
          <Box style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24, border: '2px solid #388e3c' }}>
            <SectionTitle title="✅ DESIGNACIÓN DEL GANADOR" color="#388e3c" />

            {/* Subsección 3.1 */}
            <Box style={{ marginBottom: 24 }}>
              <H4 style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Información del Designado
              </H4>
              <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, paddingLeft: 16, borderLeft: '3px solid #81c784' }}>
                <FieldRow label="Expediente de Designación" value={record.expediente_designacion} />
                <FieldRow label="Fecha de Designación" value={record.fecha_expediente_designacion} />
                <FieldRow label="Nombre" value={record.nombre_designacion} />
                <FieldRow label="CUIL" value={record.cuil_designacion} />
                <FieldRow label="Fecha de Apto Médico" value={record.fecha_apto_medico} />
              </Box>
            </Box>

            {/* Subsección 3.2 */}
            <Box>
              <H4 style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Formalización de la Designación
              </H4>
              <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, paddingLeft: 16, borderLeft: '3px solid #81c784' }}>
                <FieldRow label="Resolución de Designación" value={record.resolucion_designacion} />
                <FieldRow label="Fecha de Resolución" value={record.fecha_resolucion} />
              </Box>
            </Box>
          </Box>

          {/* Observaciones */}
          {record.observaciones && (
            <Box style={{ marginTop: 24, padding: 16, background: '#fff3e0', borderRadius: 8, border: '2px solid #ff9800' }}>
              <Text style={{ fontSize: 12, color: '#e65100', fontWeight: 700, margin: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📝 Observaciones
              </Text>
              <Text style={{ fontSize: 14, color: '#333', margin: 0, lineHeight: '1.6' }}>
                {record.observaciones}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default ConcursosDetailModal
