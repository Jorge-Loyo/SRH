/**
 * seed-modalidades.js
 * Crea la tabla `modalidades` con los valores iniciales.
 */

const { AppDataSource } = require('../src/config/data-source');

async function run() {
  await AppDataSource.initialize()
  console.log('Conectado.')

  await AppDataSource.query(`DROP TABLE IF EXISTS modalidades`)

  await AppDataSource.query(`
    CREATE TABLE modalidades (
      id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre  VARCHAR(50) NOT NULL UNIQUE,
      id_cod  VARCHAR(5)  NOT NULL DEFAULT '',
      activo  TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('Tabla creada.')

  await AppDataSource.query(`
    INSERT INTO modalidades (nombre, id_cod) VALUES ('planta', 'p'), ('guardia', 'g')
  `)

  const [{ total }] = await AppDataSource.query('SELECT COUNT(*) as total FROM modalidades')
  console.log(`Insertados: ${total} registros.`)

  await AppDataSource.destroy()
  process.exit(0)
}

run().catch(e => { console.error(e.message); process.exit(1) })
