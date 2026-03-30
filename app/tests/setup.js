process.env.NODE_ENV = 'test';
process.env.ADMIN_ENABLED = 'false';
// For tests, ensure TypeORM uses in-memory SQL.js instead of MySQL/Oracle
process.env.DB_DIALECT = 'sqljs';
// Optional: neutralize other DB vars
process.env.DB_HOST = '';
process.env.DB_PORT = '';
process.env.DB_USER = '';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = '';
// Default to DB-backed auth in tests unless a test overrides
process.env.AUTH_MODE = process.env.AUTH_MODE || 'db';
// Ensure reflect-metadata is available for TypeORM decorators
require('reflect-metadata');
