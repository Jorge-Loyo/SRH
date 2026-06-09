/**
 * Mock de adminjs para tests de componentes legacy.
 * AdminJS fue eliminado del proyecto; este mock permite que los tests
 * de componentes React que aún lo referencian no fallen por módulo faltante.
 */

class MockApiClient {
  constructor() {}
  async getPage() { return { data: [] }; }
  async resourceAction() { return { data: {} }; }
  async bulkAction() { return { data: {} }; }
  async action() { return { data: {} }; }
  async request(method, url, data) { return { data: {} }; }
}

module.exports = {
  ApiClient: MockApiClient,
  useCurrentAdmin: () => [null, () => {}],
  useAction: () => ({ href: '#', callAction: async () => {} }),
  useRecord: () => ({}),
  useTranslation: () => ({ translateMessage: (key) => key, translateLabel: (key) => key }),
  flat: { get: (obj, key) => obj?.[key], set: (obj, key, val) => ({ ...obj, [key]: val }) },
};
