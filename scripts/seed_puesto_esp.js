const { AppDataSource } = require('../app/src/config/data-source');

const MAPEO = {
  'BIOLOGO':                    [79,80,81,82,83,84,85],
  'BIOQUIMICO':                 [79,80,81,82,83,84,85],
  'FARMACEUTICO':               [88],
  'FONOAUDIOLOGO':              [89],
  'KINESIOLOGO':                [90],
  'FISIOTERAPEUTA':             [90],
  'NUTRICIONISTA DIETISTA':     [91],
  'OBSTETRICA':                 [93],
  'ODONTOLOGO':                 [87,94,95,96,97],
  'PSICOLOGO':                  [98,99],
  'PSICOPEDAGOGO':              [100],
  'SOCIOLOGO':                  [102],
  'TERAPEUTA OCUPACIONAL':      [103],
  'TRABAJADOR SOCIAL':          [101,104],
  'MUSICOTERAPEUTA':            [92],
  'LIC. EN CIENCIAS EDUC.':     [86],
  'LIC. EN COMUNICACION SOCIAL':[102],
};

AppDataSource.initialize().then(async () => {
  const puestos = await AppDataSource.query(
    "SELECT id, nombre FROM puestos_cargo WHERE carrera='cph' AND es_medico=0"
  );
  console.log('Puestos encontrados:', puestos.length);

  let n = 0;
  for (const p of puestos) {
    const esps = MAPEO[p.nombre];
    if (!esps || !esps.length) { console.log('  Sin mapeo:', p.id, p.nombre); continue; }
    for (const eid of esps) {
      const r = await AppDataSource.query(
        'INSERT IGNORE INTO puesto_especialidades (id_puesto, id_especialidad) VALUES (?, ?)',
        [p.id, eid]
      );
      if (r.affectedRows) n++;
    }
    console.log('  OK:', p.nombre, '(id='+p.id+')', '→', esps.length, 'esps');
  }

  const [{ total }] = await AppDataSource.query('SELECT COUNT(*) as total FROM puesto_especialidades');
  console.log('\nTotal filas en tabla:', total, '| Nuevas:', n);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
