import { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon, PlusIcon, TrashIcon, ArrowsPointingOutIcon,
  ArrowDownTrayIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../api/client';
import Spinner from './Spinner';

/**
 * MinutaModal — crear/editar minutas (hojas de cálculo dinámicas)
 * Props:
 *   open         boolean
 *   onClose      () => void
 *   hospitalCode string
 *   editData     object | null  (minuta existente para editar)
 *   onSave       () => void     (callback tras guardar exitosamente)
 *   inline       boolean        (renderizar embebido en la página, sin overlay)
 */
export default function MinutaModal({ open, onClose, hospitalCode, editData = null, onSave, inline = false }) {
  const isEdit = !!editData;
  const draftKey = `minuta_draft_${hospitalCode}`;

  const [titulo, setTitulo] = useState('');
  const [columns, setColumns] = useState([{ id: 'col_1', name: 'Columna 1' }]);
  const [rows, setRows] = useState([{}]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [expandedCell, setExpandedCell] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const draftTimer = useRef(null);

  // — Inicializar al abrir ——————————————————————————————————————
  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setTitulo(editData.titulo || '');
      setColumns(editData.datos_tabla?.columns || [{ id: 'col_1', name: 'Columna 1' }]);
      setRows(editData.datos_tabla?.rows || [{}]);
      setHasDraft(false);
      setError('');
      return;
    }
    // nuevo: intentar recuperar borrador
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const d = JSON.parse(saved);
        const meaningful = d.titulo || (d.columns && d.columns.length > 1) ||
          (d.rows && d.rows.some(r => Object.keys(r).length > 0));
        if (meaningful) {
          setTitulo(d.titulo || '');
          setColumns(d.columns || [{ id: 'col_1', name: 'Columna 1' }]);
          setRows(d.rows || [{}]);
          setHasDraft(true);
          setError('');
          return;
        }
      }
    } catch { /* ignore */ }
    setTitulo('');
    setColumns([{ id: 'col_1', name: 'Columna 1' }]);
    setRows([{}]);
    setHasDraft(false);
    setError('');
  }, [open, isEdit, editData, draftKey]);

  // — Auto-guardar borrador ———————————————————————————————————————
  useEffect(() => {
    if (isEdit || !open) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const meaningful = titulo || columns.length > 1 || rows.some(r => Object.keys(r).length > 0);
      if (meaningful) {
        try { localStorage.setItem(draftKey, JSON.stringify({ titulo, columns, rows })); } catch { /* ignore */ }
      }
    }, 500);
    return () => clearTimeout(draftTimer.current);
  }, [titulo, columns, rows, isEdit, open, draftKey]);

  // — Columnas ———————————————————————————————————————————————————
  const addColumn = () => {
    const id = `col_${Date.now()}`;
    setColumns(c => [...c, { id, name: `Columna ${c.length + 1}` }]);
  };

  const removeColumn = (colId) => {
    if (columns.length === 1) return;
    setConfirmDel({ type: 'col', id: colId });
  };

  const confirmRemoveColumn = () => {
    const colId = confirmDel.id;
    setColumns(c => c.filter(col => col.id !== colId));
    setRows(r => r.map(row => { const n = { ...row }; delete n[colId]; return n; }));
    setConfirmDel(null);
  };

  const renameColumn = (colId, name) =>
    setColumns(c => c.map(col => col.id === colId ? { ...col, name } : col));

  // — Filas ——————————————————————————————————————————————————————
  const addRow = () => setRows(r => [...r, {}]);

  const removeRow = (idx) => {
    if (rows.length === 1) return;
    setConfirmDel({ type: 'row', id: idx });
  };

  const confirmRemoveRow = () => {
    setRows(r => r.filter((_, i) => i !== confirmDel.id));
    setConfirmDel(null);
  };

  const setCellValue = (rowIdx, colId, value) =>
    setRows(r => r.map((row, i) => i === rowIdx ? { ...row, [colId]: value } : row));

  // — Guardar ————————————————————————————————————————————————————
  const handleSave = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { hospital_code: hospitalCode, titulo: titulo.trim(), datos_tabla: { columns, rows } };
      const url = isEdit ? `/api/minutas/${editData.id}` : '/api/minutas';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      onSave?.();
      if (inline && !isEdit) {
        // En modo inline creación: resetear el formulario para la próxima minuta
        setTitulo('');
        setColumns([{ id: 'col_1', name: 'Columna 1' }]);
        setRows([{}]);
        setHasDraft(false);
      } else {
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // — Exportar Excel ——————————————————————————————————————————————
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiFetch('/api/minutas/export', {
        method: 'POST',
        body: JSON.stringify({ columns, rows, titulo, hospitalCode }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titulo || 'minuta'}${hospitalCode ? '_' + hospitalCode : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError('No se pudo exportar: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const discardDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setTitulo('');
    setColumns([{ id: 'col_1', name: 'Columna 1' }]);
    setRows([{}]);
    setHasDraft(false);
  };

  if (!open) return null;

  // — Contenido del editor (compartido entre modal e inline) ——————
  const editorBody = (
    <>
      {/* Aviso borrador */}
      {hasDraft && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            Se recuperó un borrador guardado. Podés continuar o descartarlo.
          </p>
          <button onClick={discardDraft} className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap font-medium">
            Descartar borrador
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input
          type="text"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Ej: Reunión de Directores"
          className="form-input w-full"
          maxLength={200}
        />
      </div>

      {/* Toolbar tabla */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium text-gray-700">Datos de la tabla</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={addColumn} className="btn-secondary flex items-center gap-1.5 text-xs">
            <PlusIcon className="w-3.5 h-3.5" />Columna
          </button>
          <button onClick={addRow} className="btn-secondary flex items-center gap-1.5 text-xs">
            <PlusIcon className="w-3.5 h-3.5" />Fila
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            {exporting ? <Spinner size="sm" /> : <ArrowDownTrayIcon className="w-3.5 h-3.5" />}
            Excel
          </button>
          {exportError && <span className="text-xs text-red-600">{exportError}</span>}
        </div>
      </div>

      {/* Tabla editable */}
      <div className="overflow-auto rounded-lg border border-gray-200" style={{ maxHeight: '52vh' }}>
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="w-10 px-2 py-2 border-b border-r border-gray-200 text-gray-400 text-xs font-medium">#</th>
              {columns.map(col => (
                <th key={col.id} className="px-2 py-2 border-b border-r border-gray-200 min-w-[160px]">
                  <div className="flex flex-col gap-1">
                    <textarea
                      value={col.name}
                      onChange={e => renameColumn(col.id, e.target.value)}
                      rows={Math.max(1, (col.name.match(/\n/g) || []).length + 1)}
                      className="w-full text-xs font-semibold text-gray-700 border border-gray-200 rounded px-2 py-1 resize-none leading-snug focus:outline-none focus:ring-1 focus:ring-primary-400"
                      placeholder="Nombre columna"
                    />
                    <button
                      onClick={() => removeColumn(col.id)}
                      disabled={columns.length === 1}
                      className="self-start text-red-400 hover:text-red-600 disabled:text-gray-200 p-0.5"
                      title="Eliminar columna"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-gray-100">
                <td className="px-2 py-1 border-r border-gray-100 bg-gray-50 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-gray-400">{rIdx + 1}</span>
                    <button
                      onClick={() => removeRow(rIdx)}
                      disabled={rows.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:text-gray-200 p-0.5"
                      title="Eliminar fila"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                {columns.map(col => (
                  <td key={col.id} className="px-1 py-1 border-r border-gray-100 align-top relative">
                    <textarea
                      value={row[col.id] || ''}
                      onChange={e => setCellValue(rIdx, col.id, e.target.value)}
                      rows={Math.max(2, ((row[col.id] || '').match(/\n/g) || []).length + 1)}
                      className="w-full text-xs border-none outline-none resize-none bg-transparent leading-snug px-1 py-0.5 pr-5"
                      style={{ minHeight: 36, maxHeight: 100, overflowY: 'auto' }}
                    />
                    <button
                      onClick={() => setExpandedCell({ rowIdx: rIdx, colId: col.id, value: row[col.id] || '', colName: col.name })}
                      title="Expandir celda"
                      className="absolute top-1 right-1 text-gray-300 hover:text-gray-500 text-xs leading-none"
                    >
                      <ArrowsPointingOutIcon className="w-3 h-3" />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  // — Sub-modales (siempre como overlay, sea modal o inline) ———————
  const subModals = (
    <>
      {expandedCell && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6">
            <p className="text-sm font-bold text-gray-800 mb-1">Editar celda</p>
            <p className="text-xs text-gray-400 mb-3">
              Columna: <strong>{expandedCell.colName}</strong> · Fila {expandedCell.rowIdx + 1}
            </p>
            <textarea
              autoFocus
              value={expandedCell.value}
              onChange={e => setExpandedCell(s => ({ ...s, value: e.target.value }))}
              rows={14}
              className="form-input w-full text-sm leading-relaxed resize-y"
              placeholder="Contenido de la celda..."
            />
            <p className="text-xs text-gray-400 mt-2 mb-4">Enter para nueva línea.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setExpandedCell(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => {
                  setCellValue(expandedCell.rowIdx, expandedCell.colId, expandedCell.value);
                  setExpandedCell(null);
                }}
                className="btn-primary"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <p className="text-base font-bold text-gray-900 mb-2">
              {confirmDel.type === 'col' ? '¿Eliminar columna?' : '¿Eliminar fila?'}
            </p>
            <p className="text-sm text-gray-500 mb-5">
              {confirmDel.type === 'col'
                ? 'Se perderán todos los datos de esta columna.'
                : 'Esta acción no se puede deshacer.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDel(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={confirmDel.type === 'col' ? confirmRemoveColumn : confirmRemoveRow}
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // — Modo inline ————————————————————————————————————————————————
  if (inline) {
    return (
      <>
        <div className="bg-white rounded-xl border border-gray-200 w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? 'Editar minuta' : 'Nueva minuta'}
            </h2>
            {hospitalCode && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">Hospital: {hospitalCode}</p>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {editorBody}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            {isEdit && (
              <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size="sm" /> : <CheckIcon className="w-4 h-4" />}
              {isEdit ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
        {subModals}
      </>
    );
  }

  // — Modo modal (overlay) ————————————————————————————————————————
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-6 pb-3 sm:pb-6 bg-black/30 overflow-y-auto px-2 sm:px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full" style={{ maxWidth: 1100 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-4 border-b border-gray-200">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? 'Editar minuta' : 'Nueva minuta'}
              </h2>
              {hospitalCode && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">Hospital: {hospitalCode}</p>
              )}
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-3 sm:px-6 py-5 space-y-5">
            {editorBody}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-3 sm:px-6 py-4 border-t border-gray-200">
            <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Spinner size="sm" /> : <CheckIcon className="w-4 h-4" />}
              {isEdit ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
      {subModals}
    </>
  );
}
