/**
 * M16 — Migrar códigos legacy al formato normalizado
 *
 * Mapeo:
 *   CPH-P-XXXXXX    → CPH-POF-XXXXXX
 *   CPH-G-XXXXXX    → CPH-POU-XXXXXX
 *   CPH-J-P-XXXXXX  → CPH-J-POF-XXXXXX
 *   CPH-J-G-XXXXXX  → CPH-J-POU-XXXXXX
 *   CPH-D-P-XXXXXX  → CPH-D-XXXXXX
 *   EG-P-XXXXXX     → EG-XXXXXX
 *   ENF-P-XXXXXX    → ENF-XXXXXX
 *   TEC-P-XXXXXX    → TEC-POF-XXXXXX
 *   SG-G-XXXXXX     → SG-XXXXXX
 *   RES-XXXXXX      → sin cambio
 *   DOC-XXXXXX      → sin cambio
 */

const mysql = require('mysql2/promise');

const MIGRACIONES = [
  { like: 'CPH-P-%',   regex: /^CPH-P-(\d+)$/,   nuevo: (m) => `CPH-POF-${m[1]}`   },
  { like: 'CPH-G-%',   regex: /^CPH-G-(\d+)$/,   nuevo: (m) => `CPH-POU-${m[1]}`   },
  { like: 'CPH-J-P-%', regex: /^CPH-J-P-(\d+)$/, nuevo: (m) => `CPH-J-POF-${m[1]}` },
  { like: 'CPH-J-G-%', regex: /^CPH-J-G-(\d+)$/, nuevo: (m) => `CPH-J-POU-${m[1]}` },
  { like: 'CPH-D-P-%', regex: /^CPH-D-P-(\d+)$/, nuevo: (m) => `CPH-D-${m[1]}`     },
  { like: 'EG-P-%',    regex: /^EG-P-(\d+)$/,    nuevo: (m) => `EG-${m[1]}`         },
  { like: 'ENF-P-%',   regex: /^ENF-P-(\d+)$/,   nuevo: (m) => `ENF-${m[1]}`        },
  { like: 'TEC-P-%',   regex: /^TEC-P-(\d+)$/,   nuevo: (m) => `TEC-POF-${m[1]}`   },
  { like: 'SG-G-%',    regex: /^SG-G-(\d+)$/,    nuevo: (m) => `SG-${m[1]}`         },
];

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'dotacion_user', password: 'Matris94.',
    database: 'dotacion_db',
  });

  await conn.beginTransaction();

  try {
    let totalActualizados = 0;

    for (const { like, regex, nuevo } of MIGRACIONES) {
      const [rows] = await conn.query(
        'SELECT id, codigo FROM new_cargo WHERE codigo LIKE ?', [like]
      );

      let actualizados = 0;
      for (const row of rows) {
        const match = row.codigo.match(regex);
        if (!match) continue;
        const codigoNuevo = nuevo(match);
        await conn.query('UPDATE new_cargo SET codigo = ? WHERE id = ?', [codigoNuevo, row.id]);
        actualizados++;
      }

      console.log(`${like.replace('%', '*')} → ${actualizados} actualizados`);
      totalActualizados += actualizados;
    }

    await conn.commit();
    console.log(`\n✅ Total actualizados: ${totalActualizados}`);

    // Verificación final
    console.log('\n--- Verificación post-migración ---');
    const [formatos] = await conn.query(
      `SELECT LEFT(codigo, LENGTH(codigo) - LOCATE('-', REVERSE(codigo))) as prefijo,
              COUNT(*) as total
       FROM new_cargo
       GROUP BY prefijo
       ORDER BY total DESC`
    );
    formatos.forEach(r => console.log(r.prefijo, ':', r.total));

  } catch (e) {
    await conn.rollback();
    console.error('❌ ERROR — rollback:', e.message);
  }

  await conn.end();
}

run();
