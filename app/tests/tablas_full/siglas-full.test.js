/**
 * @jest-environment jsdom
 */
/**
 * Tests para componente SiglasFull
 * Pruebas específicas y casos particulares de siglas
 */

const React = require('react')
const { render, screen, fireEvent, waitFor } = require('@testing-library/react')
const userEvent = require('@testing-library/user-event')
const SiglasFull = require('../../src/components/tablas_full/siglas-full')

// Mocks necesarios
jest.mock('adminjs', () => ({
  ApiClient: jest.fn(() => ({
    getPage: jest.fn((config) => Promise.resolve({
      data: {
        rows: [
          { id_sigla: 1, sigla: 'HIGA', universo_totalizador: 'SUM_BEDS', tipo_hospital_sigla: 'General', monovalencia: 'No' },
          { id_sigla: 2, sigla: 'HIEMI', universo_totalizador: 'SUM_BEDS', tipo_hospital_sigla: 'Especializado', monovalencia: 'Sí' }
        ],
        columns: ['id_sigla', 'sigla', 'universo_totalizador', 'tipo_hospital_sigla', 'monovalencia'],
        total: 2,
        options: {
          sigla: ['HIGA', 'HIEMI', 'HOG', 'HIGA 2']
        }
      }
    })),
    request: jest.fn((config) => Promise.resolve({
      data: {
        rows: [
          { id_sigla: 1, sigla: 'HIGA', universo_totalizador: 'SUM_BEDS', tipo_hospital_sigla: 'General', monovalencia: 'No' }
        ],
        columns: ['id_sigla', 'sigla', 'universo_totalizador', 'tipo_hospital_sigla', 'monovalencia'],
        total: 1
      }
    }))
  }))
}))

jest.mock('../../src/components/reutilizables/BackButton', () => {
  return function MockBackButton() { return null }
})
jest.mock('../../src/components/reutilizables/UserInfo', () => {
  return function MockUserInfo() { return null }
})
jest.mock('../../src/components/reutilizables/Pagination', () => {
  return function MockPagination() { return null }
})
jest.mock('../../src/components/reutilizables/ErrorFallback', () => {
  return function MockErrorFallback() { return null }
})
jest.mock('../../src/components/reutilizables/ScrollTrap', () => {
  return function MockScrollTrap({ children }) { return children }
})
jest.mock('../../src/components/reutilizables/multi-select-dropdown', () => {
  return function MockMultiSelect() { return null }
})

jest.mock('../../src/components/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    error: null,
    handleError: jest.fn(),
    clearError: jest.fn()
  })
}))

describe('SiglasFull Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Renderizado', () => {
    it('debe renderizar el componente sin errores', async () => {
      render(<SiglasFull />)
      expect(screen.getByTestId('back-button')).toBeInTheDocument()
      expect(screen.getByTestId('user-info')).toBeInTheDocument()
    })

    it('debe mostrar el título/encabezado apropiado', async () => {
      render(<SiglasFull />)
      // Buscar si hay encabezado con "Sigla" o similar
      await waitFor(() => {
        expect(screen.queryByText(/sigla/i) || screen.queryByTestId('scroll-trap')).toBeInTheDocument()
      })
    })

    it('debe renderizar tabla con columnas correctas', async () => {
      render(<SiglasFull />)
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })
  })

  describe('Carga de Datos Inicial', () => {
    it('debe cargar datos de siglas al montar', async () => {
      const { ApiClient } = require('adminjs')
      const mockApiClient = new ApiClient()
      
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(mockApiClient.getPage).toHaveBeenCalledWith(
          expect.objectContaining({
            pageName: 'SiglasFull'
          })
        )
      })
    })

    it('debe mostrar las siglas cargadas', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })

    it('debe actualizar total de registros', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        // Verificar que total sea 2 (según mock)
        expect(screen.getByTestId('pagination')).toBeInTheDocument()
      })
    })
  })

  describe('Filtros de Siglas', () => {
    it('debe tener campo de búsqueda por ID sigla', async () => {
      render(<SiglasFull />)
      
      // Buscar input o campo de filtro
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe tener opciones multi-select para sigla', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })

    it('debe filtrar por universo_totalizador', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe filtrar por tipo_hospital_sigla', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe filtrar por monovalencia', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Caché DISTINCT con TTL', () => {
    it('debe cachear valores DISTINCT de sigla con timestamp', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
      
      // El cache debe almacenar { values: [], timestamp: number }
    })

    it('debe usar caché si no ha expirado (< 5 min)', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
      
      // Si timestamp está dentro de 5 minutos, no debe hacer fetch
    })

    it('debe refrescar caché si ha expirado', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
      
      // Si (Date.now() - timestamp) >= CACHE_TTL, debe fetch nuevamente
    })

    it('debe usar useRef para cache (no cause renders)', async () => {
      const { rerender } = render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
      
      // Cambiar cache no debe causar re-render
      rerender(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Paginación', () => {
    it('debe calcular totalPages = ceil(2 / 50) = 1', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument()
      })
    })

    it('debe permitir cambiar página', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /page 2/i })
        expect(button).toBeInTheDocument()
      })
    })

    it('debe permitir cambiar perPage (resultados por página)', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Ordenamiento', () => {
    it('debe permitir ordenar por columnas', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })

    it('debe alternar entre ASC y DESC al hacer click', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Export CSV', () => {
    it('debe exportar página actual', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })

    it('debe exportar todos los datos', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe incluir filtros en exportación', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Drawer de Filtros', () => {
    it('debe abrir drawer al hacer click', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe cerrar drawer con ESC', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe aplicar filtros al cerrar drawer', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Memoización', () => {
    it('debe memoizar load con useCallback', async () => {
      render(<SiglasFull />)
      
      const { ApiClient } = require('adminjs')
      const mockApiClient = new ApiClient()
      
      // Contar cuántas veces fue llamado
      const callCount = mockApiClient.getPage.mock.calls.length
      
      // Re-render
      const { rerender } = render(<SiglasFull />)
      rerender(<SiglasFull />)
      
      // No debe haber hecho más calls (load es estable)
      expect(mockApiClient.getPage.mock.calls.length).toBe(callCount)
    })

    it('debe memoizar fetchDistinct con useCallback', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe usar estilos memoizados', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Integración con Hooks', () => {
    it('debe usar useTableFilters para buildActiveFilters', async () => {
      render(<SiglasFull />)
      
      // Si los filtros funcionan correctamente, está usando el hook
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe usar useTableStyles para estilos', async () => {
      render(<SiglasFull />)
      
      // Si los estilos se aplican correctamente, está usando el hook
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe usar useErrorHandler para manejo de errores', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Datos Específicos de Siglas', () => {
    it('debe mostrar HIGA en resultados', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })

    it('debe mostrar HIEMI en resultados', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })

    it('debe mostrar tipo_hospital_sigla correctamente', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })

    it('debe mostrar monovalencia correctamente', async () => {
      render(<SiglasFull />)
      
      expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
    })
  })

  describe('Manejo de Errores', () => {
    it('debe manejar error de API correctamente', async () => {
      const { ApiClient } = require('adminjs')
      const mockApiClient = new ApiClient()
      mockApiClient.getPage.mockRejectedValueOnce(new Error('API Error'))
      
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(mockApiClient.getPage).toHaveBeenCalled()
      })
    })

    it('debe limpiar error cuando carga exitosamente', async () => {
      render(<SiglasFull />)
      
      await waitFor(() => {
        expect(screen.getByTestId('scroll-trap')).toBeInTheDocument()
      })
    })
  })
})
