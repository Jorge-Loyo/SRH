const { initDatabase, closeDatabase } = require('./lib/init-db')

async function main() {
  const ds = await initDatabase()
  try {
    await ds.query(`
      CREATE TABLE IF NOT EXISTS cargo_etiquetas (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        codigo      VARCHAR(50)  NOT NULL UNIQUE,
        descripcion VARCHAR(200) NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ cargo_etiquetas creada')
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
