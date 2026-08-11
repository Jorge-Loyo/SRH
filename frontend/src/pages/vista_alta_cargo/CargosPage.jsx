import { useLocation, useNavigate } from 'react-router-dom'
import AltaCargoPage from './AltaCargoPage'

const TABS = [
  { key: 'alta-pof', label: 'Cargo de Ejecucion POF', path: '/cargos',         soon: false },
  { key: 'alta-pou', label: 'Cargo de Ejecucion POU', path: '/cargos/pou',     soon: false },
  { key: 'decreto',  label: 'Cargo por Estructura',   path: '/cargos/decreto', soon: false },
]

export default function CargosPage() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const active = pathname.startsWith('/cargos/decreto') ? 'decreto'
    : pathname.startsWith('/cargos/pou') ? 'alta-pou'
    : 'alta-pof'

  return (
    <div className="px-6 py-6 max-w-none">
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
            <button key={tab.key} type="button" onClick={() => navigate(tab.path)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
      </div>

      {active === 'alta-pof' && <AltaCargoPage embedded modalidadForzada="planta" />}
      {active === 'alta-pou' && <AltaCargoPage embedded modalidadForzada="guardia" />}
      {active === 'decreto'  && <AltaCargoPage embedded modo="estructura" />}
    </div>
  )
}
