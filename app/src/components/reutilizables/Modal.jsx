import React, { useRef, useEffect } from 'react'
import { Box, H3, Text, Button } from '@adminjs/design-system'
import ScrollTrap from './ScrollTrap'

/**
 * Modal - Componente reutilizable para modales con estructura consistente
 * 
 * Proporciona:
 * - Overlay semitransparente con backdrop
 * - Container con tamaño responsive y scroll automático
 * - Header con título e información secundaria
 * - Body con ScrollTrap integrado para evitar scroll bubbling
 * - Footer con botones de acción personalizables
 * - Click-outside opcional para cerrar
 * - Estilos consistentes con AdminJS design system
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está visible
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {string} props.title - Título principal del modal
 * @param {string} [props.subtitle] - Texto secundario debajo del título (opcional)
 * @param {React.ReactNode} props.children - Contenido del modal (body)
 * @param {React.ReactNode} [props.footer] - Contenido personalizado del footer (botones)
 * @param {string} [props.maxWidth='1200px'] - Ancho máximo del modal
 * @param {boolean} [props.disableClickOutside=false] - Si es true, no cierra al hacer click fuera
 * @param {boolean} [props.disableScroll=false] - Si es true, no usa ScrollTrap (útil para modales pequeños)
 * 
 * @example
 * // Modal básico con botones estándar
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Crear Usuario"
 *   subtitle="Hospital: H001"
 *   footer={
 *     <>
 *       <Button onClick={handleClose} variant="light">Cancelar</Button>
 *       <Button onClick={handleSave} variant="primary">Guardar</Button>
 *     </>
 *   }
 * >
 *   <Label>Nombre</Label>
 *   <Input value={nombre} onChange={e => setNombre(e.target.value)} />
 * </Modal>
 * 
 * @example
 * // Modal con click-outside habilitado y scroll deshabilitado
 * <Modal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   title="Confirmar Eliminación"
 *   maxWidth="500px"
 *   disableClickOutside={false}
 *   disableScroll={true}
 *   footer={
 *     <>
 *       <Button onClick={() => setShowConfirm(false)} variant="light">Cancelar</Button>
 *       <Button onClick={handleDelete} variant="danger">Eliminar</Button>
 *     </>
 *   }
 * >
 *   <Text>¿Está seguro de eliminar este registro?</Text>
 * </Modal>
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '1200px',
  disableClickOutside = false,
  disableScroll = false
}) => {
  const modalRef = useRef(null)

  // Click-outside handler
  useEffect(() => {
    if (!isOpen || disableClickOutside) return

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, disableClickOutside, onClose])

  if (!isOpen) return null

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <Box
        ref={modalRef}
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '100%',
          maxWidth: maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box p="lg" style={{ borderBottom: '1px solid #eee', flexShrink: 0, padding: '16px 24px' }}>
          <H3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {title}
          </H3>
          {subtitle && (
            <Text color="subtle" style={{ marginTop: 4, fontSize: 14 }}>
              {subtitle}
            </Text>
          )}
        </Box>

        {/* Body */}
        {disableScroll ? (
          <Box style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px' }}>
            {children}
          </Box>
        ) : (
          <ScrollTrap style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px', overflow: 'auto' }}>
            {children}
          </ScrollTrap>
        )}

        {/* Footer */}
        {footer && (
          <Box style={{ borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0, padding: '16px 24px' }}>
            {footer}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default Modal
