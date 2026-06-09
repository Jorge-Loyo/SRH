import { useState, useEffect, useCallback, useRef } from 'react';
import { KeyIcon, NoSymbolIcon, UserIcon } from '@heroicons/react/24/outline';
import { apiGet, apiPatch, ApiError } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import ConfirmModal from '../../components/ui/ConfirmModal';

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TokensPage() {
  const [state, setState] = useState({ loading: true, rows: [], total: 0, page: 1, error: null });
  const [username, setUsername] = useState('');
  const [showRevoked, setShowRevoked] = useState(false);
  const [pageSize] = useState(30);
  const [revoking, setRevoking] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null); // { type: 'single'|'all', id?, username? }
  const tableRef = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const fetchData = useCallback(async (overrides = {}) => {
    const page = overrides.page ?? stateRef.current.page;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = { page, pageSize, active: showRevoked ? 'false' : 'true' };
      if (username.trim()) params.username = username.trim();
      const data = await apiGet('/api/seguridad/tokens', params);
      setState((s) => ({ ...s, loading: false, rows: data.rows || [], total: data.total || 0, page, error: null }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, showRevoked, pageSize]);

  useEffect(() => { fetchData({ page: 1 }); }, [username, showRevoked]);

  const revokeToken = (id) => setConfirmRevoke({ type: 'single', id });

  const revokeUser = (uname) => setConfirmRevoke({ type: 'all', username: uname });

  const executeRevoke = async () => {
    const { type, id, username } = confirmRevoke;
    setConfirmRevoke(null);
    const key = type === 'single' ? id : `user_${username}`;
    setRevoking(key);
    try {
      if (type === 'single') {
        await apiPatch(`/api/seguridad/tokens/${id}/revoke`);
      } else {
        await apiPatch(`/api/seguridad/tokens/user/${encodeURIComponent(username)}/revoke`);
      }
      fetchData({ page: stateRef.current.page });
    } catch { /* silencioso */ } finally { setRevoking(null); }
  };

  const totalPages = Math.max(1, Math.ceil(state.total / pageSize));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConfirmModal
        open={!!confirmRevoke}
        title={confirmRevoke?.type === 'single' ? '¿Revocar este token?' : `¿Revocar todos los tokens de ${confirmRevoke?.username}?`}
        message="Esta acción cerrará la sesión correspondiente."
        confirmLabel="Revocar"
        danger
        onConfirm={executeRevoke}
        onCancel={() => setConfirmRevoke(null)}
      />
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <KeyIcon className="w-5 h-5 text-primary-700" />
          <h1 className="text-lg font-bold text-gray-900">Tokens de Sesión</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Filtrar por usuario</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario..." className="form-input text-sm w-48 py-1.5" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="showRevoked" checked={showRevoked} onChange={(e) => setShowRevoked(e.target.checked)}
              className="rounded border-gray-300 text-primary-600" />
            <label htmlFor="showRevoked" className="text-sm text-gray-600 cursor-pointer">Mostrar revocados</label>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 min-h-0">
        {state.error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700 flex-shrink-0">{state.error}</div>
        )}

        {state.loading && state.rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Spinner size="lg" /><span className="text-sm">Cargando tokens...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 flex-shrink-0 text-sm text-gray-500">
              {state.loading && <Spinner size="sm" />}
              <span>{state.total.toLocaleString('es-AR')} tokens</span>
            </div>

            <div ref={tableRef} className="overflow-auto rounded-lg border border-gray-200 flex-1">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['ID', 'Usuario', 'Creado', 'Último uso', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">{row.id}</td>
                      <td className="px-3 py-2 font-medium">{row.username || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.created_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(row.last_used)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.revoked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {row.revoked ? `Revocado${row.revoked_reason ? ` (${row.revoked_reason})` : ''}` : 'Activo'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {!row.revoked && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => revokeToken(row.id)} disabled={revoking === row.id}
                              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800">
                              {revoking === row.id ? <Spinner size="sm" /> : <NoSymbolIcon className="w-3.5 h-3.5" />}
                              Token
                            </button>
                            {row.username && (
                              <button onClick={() => revokeUser(row.username)} disabled={revoking === `user_${row.username}`}
                                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800">
                                {revoking === `user_${row.username}` ? <Spinner size="sm" /> : <UserIcon className="w-3.5 h-3.5" />}
                                Usuario
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {state.rows.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400">Sin tokens</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex-shrink-0">
              <Pagination currentPage={state.page} totalPages={totalPages} totalRecords={state.total}
                onPageChange={(p) => fetchData({ page: p })} loading={state.loading} tableRef={tableRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
