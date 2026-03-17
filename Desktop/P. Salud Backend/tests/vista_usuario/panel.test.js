/**
 * Tests para Panel.jsx (vista_usuario)
 * Valida: consolidación de estados, loadDashboard, renderizado de KPIs
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

describe('Panel (vista_usuario)', () => {
  let Panel;
  let ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    ApiClient = require('adminjs').ApiClient;
    Panel = require('../../src/components/vista_usuario/panel.jsx').default;
  });

  it('debe mostrar estado de carga inicial', () => {
    const { container } = render(React.createElement(Panel));
    expect(container.textContent).toContain('Cargando datos');
  });

  it('debe consolidar estado correctamente después de carga exitosa', async () => {
    const mockData = {
      usersCount: 25,
      auditToday: 10,
      activeTokens: 5,
      recent: [
        { id: 1, created_at: new Date(), user_username: 'admin', user_role: 'admin', action: 'create', resource: 'User' }
      ]
    };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockData }),
    }));

    const { container } = render(React.createElement(Panel));

    await waitFor(() => {
      expect(container.textContent).toContain('Actividad reciente');
      expect(container.textContent).toContain('Usuarios');
      expect(container.textContent).toContain('25'); // usersCount
    });
  });

  it('debe manejar error correctamente en loadDashboard', async () => {
    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockRejectedValue(new Error('API Error')),
    }));

    const { container } = render(React.createElement(Panel));

    await waitFor(() => {
      expect(container.textContent).toContain('API Error');
    });
  });

  it('debe renderizar KPIs con valores correctos', async () => {
    const mockData = {
      usersCount: 100,
      auditToday: 50,
      activeTokens: 15,
      recent: []
    };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockData }),
    }));

    const { container } = render(React.createElement(Panel));

    await waitFor(() => {
      expect(container.textContent).toContain('100'); // usersCount
      expect(container.textContent).toContain('50'); // auditToday
      expect(container.textContent).toContain('15'); // activeTokens
    });
  });

  it('debe mostrar "Aún no hay registros" si recent está vacío', async () => {
    const mockData = {
      usersCount: 10,
      auditToday: 5,
      activeTokens: 2,
      recent: []
    };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockData }),
    }));

    const { container } = render(React.createElement(Panel));

    await waitFor(() => {
      expect(container.textContent).toContain('Aún no hay registros');
    });
  });

  it('debe renderizar tabla de actividad reciente con datos', async () => {
    const mockData = {
      usersCount: 10,
      auditToday: 5,
      activeTokens: 2,
      recent: [
        { 
          id: 1, 
          created_at: new Date('2026-01-20T10:00:00'), 
          user_username: 'admin', 
          user_role: 'admin', 
          action: 'create', 
          resource: 'User' 
        },
        { 
          id: 2, 
          created_at: new Date('2026-01-20T09:00:00'), 
          user_username: 'editor', 
          user_role: 'editor', 
          action: 'update', 
          resource: 'Persona' 
        }
      ]
    };

    ApiClient.mockImplementation(() => ({
      getDashboard: jest.fn().mockResolvedValue({ data: mockData }),
    }));

    const { container } = render(React.createElement(Panel));

    await waitFor(() => {
      expect(container.textContent).toContain('admin');
      expect(container.textContent).toContain('editor');
      expect(container.textContent).toContain('User');
      expect(container.textContent).toContain('Persona');
    });
  });
});
