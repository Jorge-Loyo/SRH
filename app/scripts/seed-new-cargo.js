/**
 * seed-new-cargo.js
 * Crea la tabla `new_cargo` donde se registran los cargos dados de alta.
 * El campo `codigo` se genera automáticamente con la nomenclatura:
 *   CPH-P-000001  (carrera - id_cod modalidad - secuencial 6 dígitos)
 *   ENF-000001    (carrera - secuencial, sin modalidad)
 *   TEC-P-000001  (carrera - id_cod modalidad - secuencial)
 */

const { AppDataSource } = require('../src/config/data-source');

async function run() {
  await AppDataSource.initialize()
  console.log('Conectado.')

  await AppDataSource.query(`DROP TABLE IF EXISTS new_cargo`)

  await AppDataSource.query(`
    CREATE TABLE new_cargo (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      codigo          VARCHAR(20)  NOT NULL UNIQUE,
      sigla           VARCHAR(20)  NOT NULL,
      carrera         VARCHAR(10)  NOT NULL,
      modalidad       VARCHAR(50)  NULL,
      nivel_formacion VARCHAR(50)  NULL,
      puesto          VARCHAR(150) NULL,
      especialidad    VARCHAR(150) NULL,
      fecha_alta      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      id_alta         INT          NOT NULL,
      INDEX idx_carrera  (carrera),
      INDEX idx_sigla    (sigla),
      INDEX idx_id_alta  (id_alta)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  console.log('Tabla new_cargo creada.')
  await AppDataSource.destroy()
  process.exit(0)
}

run().catch(e => { console.error(e.message); process.exit(1) })
