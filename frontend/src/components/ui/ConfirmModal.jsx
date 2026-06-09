/**
 * ConfirmModal — modal de confirmación reutilizable (reemplaza window.confirm/alert).
 * Uso:
 *   <ConfirmModal
 *     open={bool}
 *     title="Título"
 *     message="Mensaje descriptivo"
 *     confirmLabel="Eliminar"   // default "Confirmar"
 *     danger={true}             // default false — si true, botón rojo
 *     onConfirm={() => ...}
 *     onCancel={() => ...}
 *   />
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
        {title && <p className="font-bold text-gray-900 mb-2">{title}</p>}
        {message && <p className="text-sm text-gray-500 mb-5">{message}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`btn-primary ${danger ? 'bg-red-600 hover:bg-red-700 border-red-600' : ''}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
