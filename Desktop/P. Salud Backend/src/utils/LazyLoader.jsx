import React, { Suspense } from 'react';

/**
 * LazyLoader - Utility para code splitting con React.lazy
 * 
 * Permite cargar componentes de forma lazy (bajo demanda) reduciendo
 * el bundle inicial de la aplicación.
 * 
 * @param {Function} importFunc - Función dinámica de import (ej: () => import('./Component'))
 * @param {ReactNode} fallback - Componente a mostrar mientras carga (default: spinner simple)
 * @returns {React.Component} Componente wrapeado con Suspense
 * 
 * @example
 * // En lugar de:
 * import HeavyComponent from './HeavyComponent';
 * 
 * // Usar:
 * const HeavyComponent = LazyLoader(() => import('./HeavyComponent'));
 * 
 * @example
 * // Con fallback personalizado:
 * const HeavyComponent = LazyLoader(
 *   () => import('./HeavyComponent'),
 *   <div>Cargando componente pesado...</div>
 * );
 */
export const LazyLoader = (importFunc, fallback = <LoadingSpinner />) => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * LoadingSpinner - Fallback por defecto para LazyLoader
 * Spinner simple que se muestra mientras el componente carga
 */
function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px',
      width: '100%'
    }}>
      <div style={{
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LazyLoader;
