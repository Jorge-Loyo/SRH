/**
 * seed-cargos-alta.js
 * Crea las tablas cargos_alta, registro_cph, registro_enf, registro_tec_pou, registro_tec_pof
 */

const { AppDataSource } = require('../src/config/data-source');

async function run() {
  await AppDataSource.initialize()
  console.log('Conectado.')

  await AppDataSource.query(`DROP TABLE IF EXISTS registro_tec_pof`)
  await AppDataSource.query(`DROP TABLE IF EXISTS registro_tec_pou`)
  await AppDataSource.query(`DROP TABLE IF EXISTS registro_enf`)
  await AppDataSource.query(`DROP TABLE IF EXISTS registro_cph`)
  await AppDataSource.query(`DROP TABLE IF EXISTS cargos_alta`)

  await AppDataSource.query(`
    CREATE TABLE cargos_alta (
      id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      fecha_registro       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      carrera_seleccionada VARCHAR(10) NOT NULL,
      INDEX idx_carrera (carrera_seleccionada)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('Tabla cargos_alta creada.')

  await AppDataSource.query(`
    CREATE TABLE registro_cph (
      id_cph        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      id_alta       INT UNSIGNED NOT NULL,
      modalidad     VARCHAR(20)  NOT NULL,
      puesto        VARCHAR(150) NOT NULL DEFAULT '',
      especialidad  VARCHAR(150) NOT NULL DEFAULT '',
      numero_unico  INT NOT NULL,
      INDEX idx_id_alta (id_alta)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('Tabla registro_cph creada.')

  await AppDataSource.query(`
    CREATE TABLE registro_enf (
      id_enf          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      id_alta         INT UNSIGNED NOT NULL,
      nivel_formacion VARCHAR(50) NOT NULL,
      numero_unico    INT NOT NULL,
      INDEX idx_id_alta (id_alta)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('Tabla registro_enf creada.')

  await AppDataSource.query(`
    CREATE TABLE registro_tec_pou (
      id_pou        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      id_alta       INT UNSIGNED NOT NULL,
      puesto        VARCHAR(150) NOT NULL,
      numero_unico  INT NOT NULL,
      INDEX idx_id_alta (id_alta)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('Tabla registro_tec_pou creada.')

  await AppDataSource.query(`
    CREATE TABLE registro_tec_pof (
      id_pof        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      id_alta       INT UNSIGNED NOT NULL,
      puesto        VARCHAR(150) NOT NULL,
      numero_unico  INT NOT NULL,
      INDEX idx_id_alta (id_alta)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('Tabla registro_tec_pof creada.')

  await AppDataSource.destroy()
  process.exit(0)
}

run().catch(e => { console.error(e.message); process.exit(1) })
