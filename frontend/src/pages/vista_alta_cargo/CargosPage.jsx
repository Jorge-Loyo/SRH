import { useLocation, useNavigate } from 'react-router-dom'
import { ClockIcon } from '@heroicons/react/24/outline'
import AltaCargoPage from './AltaCargoPage'

const TABS = [
  { key: 'alta',    label: 'Cargo por Ejecucion',  path: '/cargos',         soon: false },
  { key: 'decreto', label: 'Cargo por Estructura', path: '/cargos/decreto', soon: false },
  { key: 'pou-pof', label: 'POU a POF',            path: null,              soon: true  },
  { key: 'pou-pou', label: 'POU a POU',            path: null,              soon: true  },
]

export default function CargosPage() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const active = pathname.startsWith('/cargos/decreto') ? 'decreto' : 'alta'

  return (
    <div className="px-6 py-6 max-w-none">
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab =>
          tab.soon ? (
            <span key={tab.key}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-400 cursor-not-allowed select-none -mb-px"
              title="Próximamente">
              {tab.label}
              <ClockIcon className="w-3.5 h-3.5 opacity-70" />
            </span>
          ) : (
            <button key={tab.key} type="button" onClick={() => navigate(tab.path)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab.label}
            </button>
          )
        )}
      </div>

      {active === 'alta'    && <AltaCargoPage embedded />}
      {active === 'decreto' && <AltaCargoPage embedded modo="estructura" />}
    </div>
  )
}
