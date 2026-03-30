import React, { useRef, useEffect } from 'react'

/**
 * ScrollTrap: Evita que el scroll "salte" al contenedor exterior cuando se llega al tope/fondo.
 * Útil para tablas con scroll interno que no deben propagar el scroll al body
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar dentro del ScrollTrap
 * @param {Object} props.style - Estilos CSS adicionales
 * @param {Object} props.props - Props adicionales que se pasan al div contenedor
 * 
 * @example
 * <ScrollTrap style={{ maxHeight: 400, overflow: 'auto' }}>
 *   <Table>...</Table>
 * </ScrollTrap>
 */
const ScrollTrap = ({ children, style = {}, ...props }) => {
  const ref = useRef(null)

  const onWheel = (e) => {
    const el = ref.current
    if (!el) return
    
    const { scrollTop, scrollHeight, clientHeight } = el
    const delta = e.deltaY
    const isScrollable = scrollHeight > clientHeight
    
    // Si no es scrollable, permitir que el evento se propague
    if (!isScrollable) return
    
    // Calcular si estamos en los límites
    const isAtTop = scrollTop === 0
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
    
    // Solo prevenir propagación si intentamos scrollear más allá del límite
    if ((isAtTop && delta < 0) || (isAtBottom && delta > 0)) {
      e.preventDefault()
    }
  }

  // Configurar el listener con passive: false para permitir preventDefault()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{ ...style, overscrollBehavior: 'contain' }}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  )
}

export default ScrollTrap
