// Hook compartido para construcción de filtros activos en tablas_full
// Centraliza lógica repetida en personas, cargos, roles, siglas, bajas, combined

import { useCallback } from 'react'

/**
 * Hook para construir filtros activos desde formulario
 * Filtra valores vacíos y convierte arrays a strings separados por coma
 * 
 * @returns {Function} buildActiveFilters - Función memoizada que procesa formData
 */
export function useTableFilters() {
  const buildActiveFilters = useCallback((formData) => {
    const result = {}
    for (const [key, value] of Object.entries(formData)) {
      // Si es array (multi-select)
      if (Array.isArray(value)) {
        if (value.length > 0) {
          result[key] = value.join(',')
        }
      } else {
        // Si es string/number normal
        if (value !== '' && value != null) {
          result[key] = value
        }
      }
    }
    return result
  }, [])

  return { buildActiveFilters }
}

export default useTableFilters
