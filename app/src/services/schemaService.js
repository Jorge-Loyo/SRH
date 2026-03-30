const { AppDataSource } = require('../config/data-source');
const { config } = require('../config/env');

async function getTableColumnsMySQL(table) {
  const sql = `
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `;
  return AppDataSource.query(sql, [config.db.name, table]);
}

async function getTableColumnsOracle(table) {
  // Oracle stores metadata in ALL_TAB_COLUMNS/USER_TAB_COLUMNS
  const sql = `
    SELECT column_name AS COLUMN_NAME,
           data_type   AS DATA_TYPE,
           nullable    AS IS_NULLABLE,
           data_default AS COLUMN_DEFAULT
    FROM user_tab_columns
    WHERE table_name = :table
    ORDER BY column_id
  `;
  // Note: TypeORM's query bindings differ per driver. For MySQL we used positional params,
  // for Oracle use named bindings if the driver is configured. This path activates only
  // when dialect=oracle and the oracledb driver is present.
  return AppDataSource.query(sql, { table: table.toUpperCase() });
}

async function getTableColumns(table) {
  const dialect = config.db.dialect;
  if (dialect === 'oracle') return getTableColumnsOracle(table);
  if (dialect === 'mysql') return getTableColumnsMySQL(table);
  // Fallback for test/in-memory drivers (sqljs, sqlite, etc): use metadata
  try {
    const meta = AppDataSource.getMetadata(table);
    return meta.columns.map((c) => ({
      COLUMN_NAME: c.databaseName || c.propertyName,
      DATA_TYPE: typeof c.type === 'string' ? c.type : 'unknown',
      IS_NULLABLE: c.isNullable ? 'YES' : 'NO',
      COLUMN_KEY: c.isPrimary ? 'PRI' : '',
      COLUMN_DEFAULT: c.default !== undefined ? String(c.default) : null,
    }));
  } catch (e) {
    return [];
  }
}

module.exports = { getTableColumns };
