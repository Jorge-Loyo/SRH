import { useState, useRef } from 'react';
import {
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { apiUpload, apiPost, apiDelete, ApiError } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import ConfirmModal from '../../components/ui/ConfirmModal';

const PERIODO_REGEX = /^\d{4}-\d{2}$/;
const TIPOS = {
  dotacion: { baseUrl: '/api/admin/carga-masiva/dotacion', label: 'Dotación', identidad: ['CUIL', 'Nombre', 'Cargo'] },
  pou: { baseUrl: '/api/admin/carga-masiva/pou', label: 'POU', identidad: ['Sigla', 'Perfil', 'Especialidad'] },
};

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-gray-50 text-gray-700 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-xl font-bold">{value.toLocaleString('es-AR')}</div>
    </div>
  );
}

export default function CargaMasivaPage() {
  const [tipo, setTipo] = useState('dotacion'); // 'dotacion' | 'pou'
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [periodo, setPeriodo] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [askConfirm, setAskConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // entryKey -> 'actual' (override: no pisar el valor ya cargado). Default implícito: 'nuevo'.
  const [modOverrides, setModOverrides] = useState({});
  // entryKey -> 'mantener' (override: no borrar). Default implícito: 'eliminar'.
  const [delOverrides, setDelOverrides] = useState({});

  const BASE_URL = TIPOS[tipo].baseUrl;
  const [colIdentidad1, colIdentidad2, colIdentidad3] = TIPOS[tipo].identidad;
  // Dotación identifica una fila por CUIL/Nombre/Cargo; POU por Sigla/Perfil/Especialidad.
  const identidadDe = (row) => (tipo === 'pou' ? [row.sigla, row.perfil, row.especialidad] : [row.cuil, row.nombre, row.cargo]);
  const filaInvalidaId = (f) => (tipo === 'pou' ? f.sigla : f.cuil);

  const resetAll = () => {
    setStep('upload');
    setPeriodo('');
    setFile(null);
    setPreview(null);
    setResultado(null);
    setModOverrides({});
    setDelOverrides({});
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalizar = async () => {
    setError(null);
    if (!PERIODO_REGEX.test(periodo)) {
      setError('El período debe tener formato AAAA-MM (ej: 2026-07)');
      return;
    }
    if (!file) {
      setError('Elegí el archivo .xlsx a subir');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('periodo', periodo);
      formData.append('archivo', file);
      const data = await apiUpload(`${BASE_URL}/preview`, formData);
      setPreview(data);
      setModOverrides({});
      setDelOverrides({});
      setStep('preview');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al analizar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarPreview = async () => {
    if (preview?.uploadId) {
      try { await apiDelete(`${BASE_URL}/${preview.uploadId}`); } catch { /* preview expira solo */ }
    }
    resetAll();
  };

  const handleConfirmar = async () => {
    setAskConfirm(false);
    setConfirming(true);
    setError(null);
    try {
      const resolutions = { modificados: modOverrides, eliminados: delOverrides };
      const data = await apiPost(`${BASE_URL}/${preview.uploadId}/confirm`, { resolutions });
      setResultado(data.resultado);
      setStep('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al confirmar la carga');
    } finally {
      setConfirming(false);
    }
  };

  const toggleMod = (entryKey, useActual) => {
    setModOverrides((prev) => {
      const next = { ...prev };
      if (useActual) next[entryKey] = 'actual';
      else delete next[entryKey];
      return next;
    });
  };

  const toggleDel = (entryKey, mantener) => {
    setDelOverrides((prev) => {
      const next = { ...prev };
      if (mantener) next[entryKey] = 'mantener';
      else delete next[entryKey];
      return next;
    });
  };

  const marcarTodosMod = (useActual) => {
    if (!useActual) { setModOverrides({}); return; }
    const next = {};
    preview.modificados.forEach((m) => { next[m.entryKey] = 'actual'; });
    setModOverrides(next);
  };

  const marcarTodosDel = (mantener) => {
    if (!mantener) { setDelOverrides({}); return; }
    const next = {};
    preview.eliminados.forEach((e) => { next[e.entryKey] = 'mantener'; });
    setDelOverrides(next);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConfirmModal
        open={askConfirm}
        title={`¿Confirmar carga del período ${preview?.periodo}?`}
        message="Esta acción no se puede deshacer y queda registrada en Auditoría."
        confirmLabel="Sí, confirmar carga"
        danger
        onConfirm={handleConfirmar}
        onCancel={() => setAskConfirm(false)}
      />

      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <CloudArrowUpIcon className="w-5 h-5 text-primary-700" />
          <h1 className="text-lg font-bold text-gray-900">Carga de Datos — {TIPOS[tipo].label}</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {tipo === 'pou'
            ? 'Sube el archivo mensual de ocupación POU (hoja "Base") en un solo paso. Sólo administradores.'
            : 'Sube el archivo mensual de dotación (Personas/Cargos/Siglas/Roles) en un solo paso. Sólo administradores.'}
        </p>
        {step === 'upload' && (
          <div className="flex gap-2 mt-3">
            {Object.entries(TIPOS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setTipo(key)}
                className={`px-3 py-1.5 rounded text-sm font-medium border ${
                  tipo === key ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 min-h-0">
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {step === 'upload' && (
          <div className="max-w-lg bg-white border border-gray-200 rounded-lg p-5">
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Período (AAAA-MM)</label>
              <input
                type="text"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value.trim())}
                placeholder="2026-07"
                className="form-input text-sm w-40 py-1.5"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 mb-1">Archivo (.xlsx)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
            </div>
            <button onClick={handleAnalizar} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Spinner size="sm" /> : <CloudArrowUpIcon className="w-4 h-4" />}
              Analizar archivo
            </button>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-5">
            <div className="text-sm text-gray-600">
              Archivo <span className="font-medium">{preview.archivo}</span> — período <span className="font-medium">{preview.periodo}</span>
              {preview.periodoComparacion ? (
                <> — comparado contra <span className="font-medium">{preview.periodoComparacion}</span></>
              ) : (
                <> — sin período anterior con datos para comparar (todo se muestra como nuevo)</>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <StatCard label="Nuevos" value={preview.resumen.nuevos} tone="green" />
              <StatCard label="Modificados" value={preview.resumen.modificados} tone="amber" />
              <StatCard label="Sin cambios" value={preview.resumen.sinCambios} />
              <StatCard label="Eliminados" value={preview.resumen.eliminados} tone="red" />
              {preview.resumen.siglasNuevas !== undefined && (
                <StatCard label="Siglas nuevas" value={preview.resumen.siglasNuevas} tone="blue" />
              )}
              {preview.resumen.siglasModificadas !== undefined && (
                <StatCard label="Siglas modificadas" value={preview.resumen.siglasModificadas} tone="blue" />
              )}
              <StatCard label="Filas inválidas" value={preview.resumen.filasInvalidas} tone={preview.resumen.filasInvalidas > 0 ? 'red' : 'default'} />
              {preview.resumen.advertencias !== undefined && (
                <StatCard label="Advertencias" value={preview.resumen.advertencias} tone={preview.resumen.advertencias > 0 ? 'amber' : 'default'} />
              )}
            </div>

            {preview.columnasNoMapeadas?.length > 0 && (
              <details className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
                <summary className="cursor-pointer font-medium">Columnas del archivo que no se importan ({preview.columnasNoMapeadas.length})</summary>
                <p className="mt-1">{preview.columnasNoMapeadas.join(', ')}</p>
              </details>
            )}

            {(preview.columnasFaltantesEnArchivo?.length > 0 || preview.columnasDesconocidasEnArchivo?.length > 0) && (
              <div className="flex items-start gap-2 p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  {preview.columnasFaltantesEnArchivo?.length > 0 && (
                    <p>Faltan columnas esperadas: {preview.columnasFaltantesEnArchivo.join(', ')}</p>
                  )}
                  {preview.columnasDesconocidasEnArchivo?.length > 0 && (
                    <p>Columnas nuevas no reconocidas: {preview.columnasDesconocidasEnArchivo.join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            {preview.filasInvalidas?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Filas inválidas — no se van a importar ({preview.resumen.filasInvalidas})
                </h2>
                <div className="overflow-auto max-h-48 border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Fila</th>
                        <th className="px-2 py-1.5 text-left">{colIdentidad1}</th>
                        <th className="px-2 py-1.5 text-left">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.filasInvalidas.map((f) => (
                        <tr key={f.rowNumber} className="border-t border-gray-100">
                          <td className="px-2 py-1">{f.rowNumber}</td>
                          <td className="px-2 py-1">{filaInvalidaId(f)}</td>
                          <td className="px-2 py-1 text-red-600">{f.errores.map((e) => e.motivo).join('; ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.advertencias?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Advertencias — se importan igual, pero revisá el dato ({preview.resumen.advertencias})
                </h2>
                <div className="overflow-auto max-h-48 border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Fila</th>
                        <th className="px-2 py-1.5 text-left">CUIL</th>
                        <th className="px-2 py-1.5 text-left">Advertencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.advertencias.map((f) => (
                        <tr key={f.rowNumber} className="border-t border-gray-100">
                          <td className="px-2 py-1">{f.rowNumber}</td>
                          <td className="px-2 py-1">{f.cuil}</td>
                          <td className="px-2 py-1 text-amber-700">{f.advertencias.map((a) => a.motivo).join('; ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.nuevos?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Nuevos — no estaban en {preview.periodoComparacion || 'el período anterior'} ({preview.resumen.nuevos})
                </h2>
                <div className="overflow-auto max-h-72 border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">{colIdentidad1}</th>
                        <th className="px-2 py-1.5 text-left">{colIdentidad2}</th>
                        <th className="px-2 py-1.5 text-left">{colIdentidad3}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.nuevos.map((n, i) => {
                        const [id1, id2, id3] = identidadDe(n);
                        return (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1.5 whitespace-nowrap">{id1}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{id2}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{id3 || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {preview.resumen.nuevos > preview.nuevos.length && (
                  <p className="text-xs text-gray-400 mt-1">
                    Mostrando los primeros {preview.nuevos.length} de {preview.resumen.nuevos}.
                  </p>
                )}
              </div>
            )}

            {preview.modificados?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Modificados ({preview.resumen.modificados}) — por defecto se usa el valor del archivo
                  </h2>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => marcarTodosMod(false)} className="text-primary-700 hover:underline">Usar nuevo (todos)</button>
                    <button onClick={() => marcarTodosMod(true)} className="text-gray-500 hover:underline">Mantener actual (todos)</button>
                  </div>
                </div>
                <div className="overflow-auto max-h-72 border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">{colIdentidad1}</th>
                        <th className="px-2 py-1.5 text-left">{colIdentidad2}</th>
                        <th className="px-2 py-1.5 text-left">{colIdentidad3}</th>
                        <th className="px-2 py-1.5 text-left">Cambios</th>
                        <th className="px-2 py-1.5 text-left">Usar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.modificados.map((m) => {
                        const useActual = modOverrides[m.entryKey] === 'actual';
                        const [id1, id2, id3] = identidadDe(m);
                        return (
                          <tr key={m.entryKey} className="border-t border-gray-100 align-top">
                            <td className="px-2 py-1.5 whitespace-nowrap">{id1}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{id2}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{id3}</td>
                            <td className="px-2 py-1.5">
                              {m.cambios.map((c, i) => (
                                <div key={i} className="text-gray-600">
                                  <span className="font-mono text-[11px]">{c.entity ? `${c.entity}.${c.field}` : c.field}</span>:{' '}
                                  <span className="text-red-500 line-through">{String(c.oldValue ?? '—')}</span>{' → '}
                                  <span className="text-green-600">{String(c.newValue ?? '—')}</span>
                                </div>
                              ))}
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={useActual ? 'actual' : 'nuevo'}
                                onChange={(e) => toggleMod(m.entryKey, e.target.value === 'actual')}
                                className="form-input text-xs py-1"
                              >
                                <option value="nuevo">Usar nuevo</option>
                                <option value="actual">Mantener actual</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {preview.resumen.modificados > preview.modificados.length && (
                  <p className="text-xs text-gray-400 mt-1">
                    Mostrando los primeros {preview.modificados.length} de {preview.resumen.modificados}. El resto usa el valor por defecto (nuevo).
                  </p>
                )}
              </div>
            )}

            {preview.eliminados?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Ya no están en el archivo ({preview.resumen.eliminados}) — por defecto se eliminan
                  </h2>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => marcarTodosDel(false)} className="text-red-600 hover:underline">Eliminar (todos)</button>
                    <button onClick={() => marcarTodosDel(true)} className="text-gray-500 hover:underline">Mantener (todos)</button>
                  </div>
                </div>
                <div className="overflow-auto max-h-72 border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">{colIdentidad1}</th>
                        <th className="px-2 py-1.5 text-left">{colIdentidad2}</th>
                        <th className="px-2 py-1.5 text-left">{colIdentidad3}</th>
                        <th className="px-2 py-1.5 text-left">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.eliminados.map((e) => {
                        const mantener = delOverrides[e.entryKey] === 'mantener';
                        const [id1, id2, id3] = identidadDe(e);
                        return (
                          <tr key={e.entryKey} className="border-t border-gray-100">
                            <td className="px-2 py-1.5 whitespace-nowrap">{id1}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{id2}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{id3 || '—'}</td>
                            <td className="px-2 py-1.5">
                              <select
                                value={mantener ? 'mantener' : 'eliminar'}
                                onChange={(ev) => toggleDel(e.entryKey, ev.target.value === 'mantener')}
                                className="form-input text-xs py-1"
                              >
                                <option value="eliminar">Eliminar</option>
                                <option value="mantener">Mantener</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {preview.resumen.eliminados > preview.eliminados.length && (
                  <p className="text-xs text-gray-400 mt-1">
                    Mostrando los primeros {preview.eliminados.length} de {preview.resumen.eliminados}. El resto usa el valor por defecto (eliminar).
                  </p>
                )}
              </div>
            )}

            {preview.siglasNuevas?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Siglas nuevas ({preview.resumen.siglasNuevas})
                </h2>
                <div className="overflow-auto max-h-48 border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">ID Sigla</th>
                        <th className="px-2 py-1.5 text-left">Sigla</th>
                        <th className="px-2 py-1.5 text-left">Universo totalizador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.siglasNuevas.map((s) => (
                        <tr key={s.idSigla} className="border-t border-gray-100">
                          <td className="px-2 py-1.5 whitespace-nowrap">{s.idSigla}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{s.sigla}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{s.universoTotalizador || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.siglasModificadas?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Siglas modificadas ({preview.resumen.siglasModificadas})
                </h2>
                <div className="overflow-auto max-h-48 border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">ID Sigla</th>
                        <th className="px-2 py-1.5 text-left">Sigla</th>
                        <th className="px-2 py-1.5 text-left">Cambios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.siglasModificadas.map((s) => (
                        <tr key={s.idSigla} className="border-t border-gray-100 align-top">
                          <td className="px-2 py-1.5 whitespace-nowrap">{s.idSigla}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{s.sigla}</td>
                          <td className="px-2 py-1.5">
                            {s.cambios.map((c, i) => (
                              <div key={i} className="text-gray-600">
                                <span className="font-mono text-[11px]">{c.field}</span>:{' '}
                                <span className="text-red-500 line-through">{String(c.oldValue ?? '—')}</span>{' → '}
                                <span className="text-green-600">{String(c.newValue ?? '—')}</span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2 pb-6">
              <button onClick={handleCancelarPreview} className="btn-secondary">Cancelar</button>
              <button onClick={() => setAskConfirm(true)} disabled={confirming} className="btn-primary flex items-center gap-2">
                {confirming ? <Spinner size="sm" /> : <CheckCircleIcon className="w-4 h-4" />}
                Confirmar carga
              </button>
            </div>
          </div>
        )}

        {step === 'done' && resultado && (
          <div className="max-w-lg bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 text-green-700 mb-3">
              <CheckCircleIcon className="w-6 h-6" />
              <h2 className="font-bold">Carga completada — período {resultado.periodo}</h2>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 mb-5">
              {resultado.siglas !== undefined && <li>Siglas escritas: {resultado.siglas}</li>}
              {resultado.cargos !== undefined && <li>Cargos escritos: {resultado.cargos}</li>}
              {resultado.personas !== undefined && <li>Personas escritas: {resultado.personas}</li>}
              {resultado.roles !== undefined && <li>Roles escritos: {resultado.roles}</li>}
              {resultado.escritos !== undefined && <li>Registros escritos: {resultado.escritos}</li>}
              <li>Registros eliminados: {resultado.eliminados}</li>
            </ul>
            <button onClick={resetAll} className="btn-primary flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4" />
              Cargar otro archivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
