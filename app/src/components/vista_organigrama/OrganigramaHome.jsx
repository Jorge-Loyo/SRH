import React from 'react'
import { Box } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import HospitalSelector from '../reutilizables/HospitalSelector'
import { hospitals } from '../datos-comunes/hospitals-data'

const OrganigramaHome = () => {
  const handleSelectHospital = (hospital) => {
    const url = `/admin/pages/OrganigramaDetalle?hospital=${encodeURIComponent(hospital.id)}`
    window.location.href = url
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
        <HospitalSelector
          hospitals={hospitals}
          onSelect={handleSelectHospital}
          title="Organigrama"
          subtitle="Seleccione un hospital para ver su organigrama"
          groupBy="category"
        />
      </Box>
      <UserInfo />
    </Box>
  )
}

export default OrganigramaHome
