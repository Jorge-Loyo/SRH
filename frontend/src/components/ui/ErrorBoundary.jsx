import { Component } from 'react'

// Cuando se publica un build nuevo, los chunks de las páginas (lazy-loaded)
// cambian de nombre. Si el navegador tenía la pestaña abierta con el bundle
// viejo, un import dinámico puede pedir un chunk que ya no existe (404) y
// React no tiene cómo recuperarse de eso solo — sin este boundary la pantalla
// queda en blanco hasta que el usuario recarga a mano.
const CHUNK_ERROR_PATTERN = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError/i
export const CHUNK_RELOAD_FLAG = 'spa_chunk_reload_attempted'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    const isChunkError = CHUNK_ERROR_PATTERN.test(error?.message || '')
    if (isChunkError && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1')
      window.location.reload()
    }
  }

  handleReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG)
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <p className="text-sm text-gray-500">Hubo un problema al cargar la página.</p>
            <button onClick={this.handleReload} className="btn-primary text-sm">
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
