import { useLocation, useNavigate } from 'react-router-dom'
import AltaCargoPage   from './AltaCargoPage'
import ListaCargosPage from './ListaCargosPage'
import SubirDataPage   from './SubirDataPage'

const TABS = [
  { key: 'alta',   label: 'Alta de Cargo', path: '/cargos'        },
  { key: 'lista',  label: 'Cargos',        path: '/cargos/lista'  },
  { key: 'subir',  label: 'Subir Data',    path: '/cargos/subir'  },
]

export default function CargosPage() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const active = pathname.startsWith('/cargos/subir') ? 'subir'
               : pathname.startsWith('/cargos/lista') ? 'lista'
               : 'alta'

  return (
    <div className="px-6 py-6">
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

      {active === 'alta'  && <AltaCargoPage embedded />}
      {active === 'lista' && <ListaCargosPage />}
      {active === 'subir' && <SubirDataPage />}
    </div>
  )
}
