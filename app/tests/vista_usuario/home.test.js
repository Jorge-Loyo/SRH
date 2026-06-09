/**
 * @jest-environment jsdom
 */
/**
 * Tests para Home.jsx (vista_usuario)
 * Valida: consolidación de estados, manejo de errores, renderizado por rol
 */

const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');

// Mock de AdminJS ApiClient
jest.mock('adminjs', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({
    getDashboard: jest.fn(),
  })),
}));

// Mock de fetch
global.fetch = jest.fn();

// Mock de componentes reutilizables
jest.mock('../../src/components/reutilizables/BackButton', () => {
  return function MockBackButton() { return null }
});

jest.mock('../../src/components/reutilizables/UserInfo', () => {
  return function MockUserInfo() { return null }
});

jest.mock('../../src/components/reutilizables/ErrorFallback', () => {
  return function MockErrorFallback() { return null }
});

jest.mock('../../src/components/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('../../src/config/pagePermissions', () => ({
  getAllowedPages: jest.fn((role) => {
    const permissions = {
      admin: ['Panel', 'Usuarios', 'Hospitales'],
      editor: ['Panel', 'Hospitales'],
      viewer: ['Hospitales'],
    };
    return permissions[role] || [];
  }),
}));

describe('Home (vista_usuario)', () => {
  let Home;
  let ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules para forzar re-import
    jest.resetModules();
    
    // Re-import después de configurar mocks
    ApiClient = require('adminjs').ApiClient;
    Home = require('../../src/components/vista_usuario/home.jsx').default;
  });

  it('debe mostrar estado de carga inicial', () => {
    const { container } = render(React.createElement(Home));
    expect(container.textContent).toContain('Cargando');
  });

  it('debe consolidar estado correctamente después de carga exitosa', async () => {
    const mockDashboardData = { usersCount: 10, auditToday: 5 };
    const mockMeData = { currentAdmin: { role: 'admin', username: 'admin' } };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockDashboardData }),
    }));

    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockMeData),
    });

    const { container } = render(React.createElement(Home));

    await waitFor(() => {
      expect(container.textContent).toContain('Secciones Disponibles');
    });
  });

  it('debe propagar error si meRes falla', async () => {
    const mockDashboardData = { usersCount: 10 };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockDashboardData }),
    }));

    // Simular fallo en /admin/me
    global.fetch.mockRejectedValue(new Error('Failed to fetch user'));

    const { container } = render(React.createElement(Home));

    await waitFor(() => {
      expect(container.textContent).toContain('No se pudo verificar tu rol');
    });
  });

  it('debe mostrar error si dashboard falla', async () => {
    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockRejectedValue(new Error('Dashboard error')),
    }));

    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ currentAdmin: { role: 'viewer' } }),
    });

    const { container } = render(React.createElement(Home));

    await waitFor(() => {
      expect(container.textContent).toContain('Dashboard error');
    });
  });

  it('debe mostrar secciones según rol (admin)', async () => {
    const mockDashboardData = { usersCount: 10 };
    const mockMeData = { currentAdmin: { role: 'admin', username: 'admin' } };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockDashboardData }),
    }));

    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockMeData),
    });

    const { container } = render(React.createElement(Home));

    await waitFor(() => {
      // Admin debe ver Tablas BD y Seguridad
      expect(container.textContent).toContain('Tablas (BD)');
      expect(container.textContent).toContain('Seguridad');
    });
  });

  it('debe mostrar secciones según rol (viewer)', async () => {
    const mockDashboardData = { usersCount: 10 };
    const mockMeData = { currentAdmin: { role: 'viewer', username: 'viewer' } };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockDashboardData }),
    }));

    global.fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockMeData),
    });

    const { container } = render(React.createElement(Home));

    await waitFor(() => {
      // Viewer NO debe ver Tablas BD ni Seguridad
      expect(container.textContent).not.toContain('Tablas (BD)');
      expect(container.textContent).not.toContain('Seguridad');
      expect(container.textContent).toContain('Estructuras');
    });
  });
});
