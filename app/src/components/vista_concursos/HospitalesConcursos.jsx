import React from 'react'
import { Box } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import HospitalSelector from '../reutilizables/HospitalSelector'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { getErrorMessage } from '../../utils/httpErrorHandler'
import { hospitals } from '../datos-comunes/hospitals-data'

const HospitalesConcursos = () => {
  const { error } = useErrorHandler()

  if (error) {
    return <ErrorFallback error={error} onRetry={() => window.location.reload()} componentName="HospitalesConcursos" />
  }

  const handleSelectHospital = (hospital) => {
    const url = `/admin/pages/TablonConcursos?hospital=${encodeURIComponent(hospital.id)}&name=${encodeURIComponent(hospital.name)}`
    window.location.href = url
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
        <HospitalSelector
          hospitals={hospitals}
          onSelect={handleSelectHospital}
          title="Gestión de Concursos"
          subtitle="Seleccione un hospital para ver los concursos activos y en progreso"
          groupBy="category"
        />
      </Box>
      <UserInfo />
    </Box>
  )
}

export default HospitalesConcursos
