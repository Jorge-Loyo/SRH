import { useState, useRef } from 'react';
import { CloudArrowUpIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { apiUpload, apiPost, apiDelete, ApiError } from '../../api/client';
import ConfirmModal from '../../components/ui/ConfirmModal';
import CargaMasivaUploader from './CargaMasivaUploader';
import CargaMasivaDiffTable from './CargaMasivaDiffTable';

const PERIODO_REGEX = /^\d{4}-\d{2}$/;
const TIPOS = {
  dotacion: { baseUrl: '/api/admin/carga-masiva/dotacion', label: 'Dotación' },
  pou:      { baseUrl: '/api/admin/carga-masiva/pou',      label: 'POU' },
};

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
    <div className="flex flex-col">
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
          <CargaMasivaUploader
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            onFileChange={setFile}
            onAnalizar={handleAnalizar}
            loading={loading}
            fileInputRef={fileInputRef}
          />
        )}

        {step === 'preview' && preview && (
          <CargaMasivaDiffTable
            preview={preview}
            tipo={tipo}
            modOverrides={modOverrides}
            delOverrides={delOverrides}
            onToggleMod={toggleMod}
            onToggleDel={toggleDel}
            onMarcarTodosMod={marcarTodosMod}
            onMarcarTodosDel={marcarTodosDel}
            onCancelar={handleCancelarPreview}
            onConfirmar={() => setAskConfirm(true)}
            confirming={confirming}
          />
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
