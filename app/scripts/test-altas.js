/**
 * test-altas.js — Prueba los 16 casos de alta y verifica campos FK en BD
 */
const mysql = require('mysql2/promise');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4NjU0MTE5MiwiZXhwIjoxNzg2NTQyOTkyfQ.I1pXKLH_P_aYtnzLgMpTk0jYtdRbSXP76V1D10RZRWY';
const BASE   = 'http://localhost:3000/api/cargos/alta';
const BASE_FECHA = '2026-09-01';

const CASOS = [
  // 1. CPH ejecución POF
  { label: '01 CPH ejecucion POF', payload: { carrera_seleccionada:'cph', sigla:'HGAIP', modalidad:'planta', puesto:'MEDICO', especialidad:'CLINICA MEDICA', tipo_cph:'ejecucion', tipo_alta:'ejecucion', documento:'EX-2026-TEST-001', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 2. CPH ejecución POU
  { label: '02 CPH ejecucion POU', payload: { carrera_seleccionada:'cph', sigla:'HGAIP', modalidad:'guardia', puesto:'ESPECIALISTA MEDICO', especialidad:'CLINICA MEDICA', tipo_cph:'ejecucion', tipo_alta:'ejecucion', documento:'EX-2026-TEST-002', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 3. CPH estructura jefe POF
  { label: '03 CPH estructura jefe POF', payload: { carrera_seleccionada:'cph', sigla:'HGAIP', modalidad:'planta', puesto:'JEFE DIVISION', tipo_cph:'jefe', tipo_alta:'estructura', documento:'DEC-2026-TEST-003', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 4. CPH estructura director
  { label: '04 CPH estructura director', payload: { carrera_seleccionada:'cph', sigla:'HGAIP', tipo_cph:'director', tipo_alta:'estructura', documento:'DEC-2026-TEST-004', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 5. CPH estructura subdirector
  { label: '05 CPH estructura subdirector', payload: { carrera_seleccionada:'cph', sigla:'HGAIP', tipo_cph:'subdirector', tipo_alta:'estructura', documento:'DEC-2026-TEST-005', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 6. ENF ejecución con jornada
  { label: '06 ENF ejecucion con jornada', payload: { carrera_seleccionada:'enf', sigla:'HGAIP', jornada:'Jornada completa', tipo_alta:'ejecucion', documento:'EX-2026-TEST-006', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 7. TEC POF
  { label: '07 TEC POF', payload: { carrera_seleccionada:'tec', sigla:'HGAIP', modalidad:'planta', puesto:'TECNICO EN RADIOLOGIA', tipo_tec:'pof', tipo_alta:'ejecucion', documento:'EX-2026-TEST-007', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 8. TEC POU
  { label: '08 TEC POU', payload: { carrera_seleccionada:'tec', sigla:'HGAIP', modalidad:'guardia', puesto:'TECNICO EN RADIOLOGIA', tipo_tec:'pou', tipo_alta:'ejecucion', documento:'EX-2026-TEST-008', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 9. EG ejecución
  { label: '09 EG ejecucion', payload: { carrera_seleccionada:'eg', sigla:'HGAIP', puesto:'ADMINISTRATIVO', tipo_eg:'ejecucion', tipo_alta:'ejecucion', documento:'EX-2026-TEST-009', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 10. EG estructura jefe_eg
  { label: '10 EG estructura jefe_eg', payload: { carrera_seleccionada:'eg', sigla:'HGAIP', puesto:'JEFE DIVISION', tipo_eg:'jefe_eg', tipo_alta:'estructura', documento:'DEC-2026-TEST-010', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 11. EG estructura gerencial GERENTE
  { label: '11 EG estructura gerencial', payload: { carrera_seleccionada:'eg', sigla:'HGAIP', puesto:'GERENTE', tipo_eg:'gerencial', tipo_alta:'estructura', documento:'DEC-2026-TEST-011', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 12. EG estructura director_eg
  { label: '12 EG estructura director_eg', payload: { carrera_seleccionada:'eg', sigla:'HGAIP', tipo_eg:'director_eg', tipo_alta:'estructura', documento:'DEC-2026-TEST-012', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 13. AS ministro
  { label: '13 AS ministro', payload: { carrera_seleccionada:'as', sigla:'MSGC', tipo_as:'ministro', tipo_alta:'estructura', documento:'DEC-2026-TEST-013', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 14. AS subsecretaria
  { label: '14 AS subsecretaria', payload: { carrera_seleccionada:'as', sigla:'MSGC', tipo_as:'subsecretaria', tipo_alta:'estructura', documento:'DEC-2026-TEST-014', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 15. AS dir_general
  { label: '15 AS dir_general', payload: { carrera_seleccionada:'as', sigla:'MSGC', tipo_as:'dir_general', tipo_alta:'estructura', documento:'DEC-2026-TEST-015', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
  // 16. AS dir_general_adjunta
  { label: '16 AS dir_general_adjunta', payload: { carrera_seleccionada:'as', sigla:'MSGC', tipo_as:'dir_general_adjunta', tipo_alta:'estructura', documento:'DEC-2026-TEST-016', cargo_desde: BASE_FECHA, antiguedad: BASE_FECHA, cantidad:1 } },
];

async function post(payload) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

async function verificar(conn, codigo) {
  const [[row]] = await conn.query(
    `SELECT nc.id, nc.codigo, nc.carrera, nc.tipo_cargo,
            nc.id_carrera, nc.id_modalidad, nc.id_puesto, nc.id_especialidad,
            nc.id_jornada, nc.id_tipo_cargo, nc.id_etiqueta, nc.id_alta, nc.estado
     FROM new_cargo nc WHERE nc.codigo = ?`, [codigo]
  );
  return row;
}

async function run() {
  const conn = await mysql.createConnection({ host:'localhost', port:3306, user:'dotacion_user', password:'Matris94.', database:'dotacion_db' });

  const resultados = [];
  let ok = 0, errores = 0;

  for (const caso of CASOS) {
    try {
      const { status, body } = await post(caso.payload);
      if (status !== 200 && status !== 201) {
        console.log(`❌ ${caso.label} — HTTP ${status}: ${JSON.stringify(body)}`);
        errores++;
        resultados.push({ label: caso.label, ok: false, error: body });
        continue;
      }
      const codigo = body.codigos?.[0];
      const row = await verificar(conn, codigo);
      if (!row) {
        console.log(`❌ ${caso.label} — codigo ${codigo} no encontrado en BD`);
        errores++;
        continue;
      }

      // Validaciones
      const issues = [];
      if (!row.id_carrera)  issues.push('id_carrera NULL');
      if (!row.id_alta)     issues.push('id_alta NULL');
      if (row.estado !== 'vigente') issues.push(`estado=${row.estado}`);

      const c = caso.payload.carrera_seleccionada;
      const tipoCph = caso.payload.tipo_cph
      const sinModalidad = ['director','subdirector'].includes(tipoCph)
      if (['cph','tec'].includes(c) && !row.id_modalidad && !sinModalidad) issues.push('id_modalidad NULL');
      if (c === 'cph' && caso.payload.tipo_cph === 'ejecucion' && !row.id_puesto) issues.push('id_puesto NULL');
      if (c === 'cph' && caso.payload.tipo_cph === 'ejecucion' && !row.id_especialidad) issues.push('id_especialidad NULL');
      if (c === 'enf' && caso.payload.jornada && !row.id_jornada) issues.push('id_jornada NULL');
      if (c === 'tec' && !row.id_puesto) issues.push('id_puesto NULL');
      if (['jefe','director','subdirector','jefe_eg','director_eg','gerencial','ministro','subsecretaria','dir_general','dir_general_adjunta'].includes(caso.payload.tipo_cph ?? caso.payload.tipo_eg ?? caso.payload.tipo_as) && !row.id_tipo_cargo) issues.push('id_tipo_cargo NULL');
      if (caso.payload.categoria_interna && !row.id_etiqueta) issues.push('id_etiqueta NULL');

      if (issues.length) {
        console.log(`⚠️  ${caso.label} — ${codigo} — ISSUES: ${issues.join(', ')}`);
        console.log(`    BD: id_carrera=${row.id_carrera} id_modalidad=${row.id_modalidad} id_puesto=${row.id_puesto} id_esp=${row.id_especialidad} id_jornada=${row.id_jornada} id_tipo=${row.id_tipo_cargo} id_etiq=${row.id_etiqueta} id_alta=${row.id_alta}`);
        errores++;
      } else {
        console.log(`✅ ${caso.label} — ${codigo}`);
        console.log(`    id_carrera=${row.id_carrera} id_modalidad=${row.id_modalidad} id_puesto=${row.id_puesto} id_esp=${row.id_especialidad} id_jornada=${row.id_jornada} id_tipo=${row.id_tipo_cargo} id_etiq=${row.id_etiqueta} id_alta=${row.id_alta}`);
        ok++;
      }
      resultados.push({ label: caso.label, ok: issues.length === 0, codigo, issues });
    } catch(e) {
      console.log(`❌ ${caso.label} — EXCEPCION: ${e.message}`);
      errores++;
    }
  }

  console.log(`\n--- RESUMEN: ${ok} OK / ${errores} con problemas ---`);
  await conn.end();
}

run();
