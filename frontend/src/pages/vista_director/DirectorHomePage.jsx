import { useNavigate } from 'react-router-dom';
import {
  BuildingOffice2Icon, TableCellsIcon,
  ChartBarSquareIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../auth/AuthContext';

export default function DirectorHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const code = user?.hospital_code;

  if (!code) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-16">
          <BuildingOffice2Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No tenés un hospital asignado</p>
          <p className="text-gray-400 text-sm mt-1">Contactá al administrador para asignar un código de hospital a tu usuario.</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      icon: <TableCellsIcon className="w-6 h-6" />,
      title: 'Organización - Dotación',
      description: 'Visualizá la dotación activa y vacantes de tu hospital',
      action: () => navigate(`/hospitales/${code}`),
      color: 'text-primary-700 bg-primary-50',
    },
    {
      icon: <ChartBarSquareIcon className="w-6 h-6" />,
      title: 'Organigrama',
      description: 'Árbol jerárquico con personal asignado por área',
      action: () => navigate(`/organigrama/${code}`),
      color: 'text-indigo-700 bg-indigo-50',
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-100">
            <BuildingOffice2Icon className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mi Hospital</h1>
            <p className="text-sm text-gray-500">
              <span className="font-mono font-semibold text-primary-700">{code}</span>
              {user?.username && <> · {user.username}</>}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {cards.map((c) => (
            <button key={c.title} onClick={c.action}
              className="flex flex-col gap-3 p-5 rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition-all text-left group">
              <div className={`inline-flex p-3 rounded-lg ${c.color}`}>{c.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{c.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-primary-600 mt-auto">
                Abrir <ArrowRightIcon className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
