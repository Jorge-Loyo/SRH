const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dotacion RRHH API',
      version: '1.0.0',
      description: 'API del sistema de gestión de dotación de RRHH — Ministerio de Salud GCBA',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: 'Auth',           description: 'Autenticacion y sesion' },
      { name: 'Alta de Cargo',  description: 'Alta de cargos por expediente' },
      { name: 'Cargos',         description: 'Consulta y gestion de cargos' },
      { name: 'Siglas',         description: 'Efectores / siglas' },
      { name: 'Personas',       description: 'Personas' },
      { name: 'POU',            description: 'Planta Organica de Urgencia' },
      { name: 'Concursales',    description: 'Bajas, seguimiento CPH y CEETPS' },
      { name: 'Herramientas',   description: 'Dotaneitor y herramientas internas' },
      { name: 'Admin',          description: 'Administracion del sistema' },
    ],
  },
  // Escanear rutas para anotaciones JSDoc @swagger
  apis: [
    './src/routes/*.js',
    './src/modules/**/*Routes.js',
  ],
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec
