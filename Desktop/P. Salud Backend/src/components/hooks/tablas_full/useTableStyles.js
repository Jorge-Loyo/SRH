// Hook compartido para estilos inline de tablas_full
// Centraliza estilos repetidos entre componentes

import { useMemo } from 'react'

/**
 * Hook que retorna estilos comunes para componentes tablas_full
 * Usa useMemo para evitar re-creación del objeto en cada render
 * 
 * @returns {Object} Objeto con todos los estilos reutilizables
 */
export function useTableStyles() {
  const styles = useMemo(() => ({
    headerStyle: { 
      position: 'sticky', 
      top: 0, 
      background: '#F4F6F8', 
      zIndex: 1, 
      borderBottom: '2px solid #111' 
    },
    labelStyle: { 
      display: 'block', 
      fontSize: 12, 
      fontWeight: 600, 
      marginBottom: 4, 
      color: '#cbd5ff' 
    },
    sectionTitleStyle: { 
      fontSize: 12, 
      fontWeight: 700, 
      color: '#AAB8FF', 
      textTransform: 'uppercase', 
      letterSpacing: 0.4, 
      borderTop: '1px solid rgba(255,255,255,0.2)', 
      paddingTop: 8, 
      marginTop: 6 
    },
    cellLeft: { 
      paddingLeft: 8, 
      paddingRight: 8 
    },
    cellRight: { 
      paddingLeft: 8, 
      paddingRight: 8 
    }
  }), [])

  return styles
}

export default useTableStyles
