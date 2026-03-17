#!/usr/bin/env node

/**
 * Script: Auditar estructura del CSV vs Entidad Concurso
 * 
 * Objetivo: Verificar qué columnas existen en el CSV y cuál es su mapeo actual
 * en load-concursos.js
 * 
 * Uso:
 *   node scripts/audit-csv-mapping.js [archivo.csv]
 * 
 * Ejemplo:
 *   node scripts/audit-csv-mapping.js Concursos.csv
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Campos esperados en la entidad Concurso (según Concurso.ts)
 */
const ENTITY_FIELDS = {
  // Campos base
  id_concurso: 'number',
  sigla: 'string',
  estado: 'string',
  sub_estado: 'string',
  
  // SECCIÓN BAJA
  ee_baja: 'string',
  cuil_baja: 'string',
  nombre_baja: 'string',
  fecha_baja: 'date',
  escalafon_baja: 'string',
  puesto_baja: 'string',
  especialidad_baja: 'string',
  
  // SECCIÓN CONCURSO - SUBSECCIÓN 1
  ee_concurso: 'string',
  fecha_ee_concurso: 'date',
  escalafon_concurso: 'string',
  puesto_alta: 'string',
  especialidad_solicitada_de_alta: 'string',
  fecha_autorizacion: 'date',
  sorteo_de_jurado: 'boolean',
  
  // SECCIÓN CONCURSO - SUBSECCIÓN 2
  disposicion_concurso: 'string',
  fecha_desde: 'date',
  fecha_hasta: 'date',
  fecha_examen: 'date',
  orden_merito: 'string',
  fecha_orden_merito: 'date',
  
  // SECCIÓN DESIGNACIÓN - SUBSECCIÓN 1
  expediente_designacion: 'string',
  fecha_expediente_designacion: 'date',
  nombre_designacion: 'string',
  cuil_designacion: 'string',
  fecha_apto_medico: 'date',
  
  // SECCIÓN DESIGNACIÓN - SUBSECCIÓN 2
  resolucion_designacion: 'string',
  fecha_resolucion: 'date',
  
  // OTROS
  codigo_cargo: 'string',
  observaciones: 'string'
};

/**
 * Mapeo actual en load-concursos.js
 * (extraído manualmente del switch statement)
 */
const CURRENT_MAPPING = {
  'ID CONCURSO': 'id_concurso',
  'SIGLA': 'sigla',
  'ESTADO': 'estado',
  'SUB ESTADO': 'sub_estado',
  'EE BAJA/ AMPLIACION': 'ee_baja',
  'CUIL BAJA': 'cuil_baja',
  'NOMBRE BAJA': 'nombre_baja',
  'FECHA BAJA': 'fecha_baja',
  'ESCALAFON': 'escalafon',           // ❌ PROBLEMA: mapea a "escalafon" (no existe)
  'PUESTO BAJA': 'puesto_baja',
  'ESPECIALIDAD BAJA': 'especialidad_baja',
  'EE CONCURSO': 'ee_concurso',
  'PUESTO ALTA': 'puesto_alta',
  'ESPECIALIDAD SOLICITADA DE ALTA': 'especialidad_solicitada_de_alta',
  'FECHA AUTORIZACION': 'fecha_autorizacion',
  'SORTEO DE JURADO': 'sorteo_de_jurado',
  'FECHA INSC HASTA': 'fecha_hasta',
  'FECHA EXAMEN': 'fecha_examen',
  'NOMBRE DESIGNACION': 'nombre_designacion',
  'OBSERVACIONES': 'observaciones',
  'COD CARGO': 'cod_cargo'            // ❌ PROBLEMA: mapea a "cod_cargo" (debería ser "codigo_cargo")
};

/**
 * Parseador CSV simple
 */
function parseCSVLine(line, delimiter = ';') {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Función principal
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 AUDITORÍA: Mapeo CSV ↔ Entidad Concurso');
  console.log('='.repeat(80) + '\n');

  // Obtener archivo CSV
  const csvFile = process.argv[2] || 'Concursos.csv';
  const csvPath = path.resolve(__dirname, '..', csvFile);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Archivo no encontrado: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂 Archivo analizado: ${csvPath}\n`);

  try {
    // Leer encabezados
    const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const headers = [];
    let firstLine = true;

    // Solo leer primera línea (encabezados)
    for await (const line of rl) {
      if (firstLine) {
        const parsed = parseCSVLine(line);
        headers.push(...parsed);
        break;
      }
    }

    if (headers.length === 0) {
      console.error('❌ No se pudieron leer los encabezados');
      process.exit(1);
    }

    console.log(`📊 Encabezados del CSV (${headers.length} columnas):\n`);
    headers.forEach((h, i) => {
      console.log(`  ${String(i + 1).padStart(3, ' ')}. ${h}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('📋 ANÁLISIS DE MAPEO');
    console.log('='.repeat(80) + '\n');

    // Analizar mapeos
    const mapped = new Set();
    const unmapped = [];
    const problematic = [];

    for (const [csvColumn, entityField] of Object.entries(CURRENT_MAPPING)) {
      if (headers.includes(csvColumn)) {
        mapped.add(csvColumn);
        
        // Verificar si el entityField existe en la entidad
        if (!ENTITY_FIELDS.hasOwnProperty(entityField)) {
          problematic.push({
            csv: csvColumn,
            target: entityField,
            issue: 'Campo no existe en entidad'
          });
        }
      } else {
        unmapped.push({
          csv: csvColumn,
          target: entityField,
          issue: 'Columna no existe en CSV'
        });
      }
    }

    // Campos del CSV sin mapeo
    const csvUnmapped = headers.filter(h => !Object.keys(CURRENT_MAPPING).includes(h));

    // Campos de la entidad sin mapeo en CSV
    const entityUnmapped = Object.keys(ENTITY_FIELDS).filter(
      f => !Object.values(CURRENT_MAPPING).includes(f)
    );

    // ====== REPORTE ======
    console.log(`✅ COLUMNAS MAPEADAS CORRECTAMENTE: ${mapped.size}/${headers.length}\n`);
    Array.from(mapped).forEach(col => {
      const target = CURRENT_MAPPING[col];
      console.log(`   ✅ "${col}" → "${target}"`);
    });

    if (problematic.length > 0) {
      console.log(`\n⚠️  PROBLEMAS EN MAPEO (${problematic.length}):\n`);
      problematic.forEach(p => {
        console.log(`   🔴 "${p.csv}" → "${p.target}"`);
        console.log(`      Problema: ${p.issue}\n`);
      });
    }

    if (unmapped.length > 0) {
      console.log(`\n❌ COLUMNAS ESPERADAS PERO NO EN CSV (${unmapped.length}):\n`);
      unmapped.forEach(u => {
        console.log(`   ❌ "${u.csv}" (se mapearía a "${u.target}")`);
      });
    }

    if (csvUnmapped.length > 0) {
      console.log(`\n⚠️  COLUMNAS EN CSV SIN MAPEO (${csvUnmapped.length}):\n`);
      console.log(`   Estas columnas existen pero no se usan:\n`);
      csvUnmapped.forEach(col => {
        console.log(`   ⚠️  "${col}"`);
      });
    }

    if (entityUnmapped.length > 0) {
      console.log(`\n🔴 CAMPOS DE ENTIDAD SIN MAPEO EN CSV (${entityUnmapped.length}):\n`);
      console.log(`   Estos campos siempre serán NULL:\n`);
      entityUnmapped.forEach(field => {
        const type = ENTITY_FIELDS[field];
        console.log(`   🔴 ${field} (${type})`);
      });
    }

    // ====== SUMMARY ======
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80) + '\n');

    const coveragePercent = Math.round((mapped.size / Object.keys(CURRENT_MAPPING).length) * 100);
    const entityCoveragePercent = Math.round(((Object.keys(ENTITY_FIELDS).length - entityUnmapped.length) / Object.keys(ENTITY_FIELDS).length) * 100);

    console.log(`   CSV Coverage: ${coveragePercent}%`);
    console.log(`   Entity Coverage: ${entityCoveragePercent}%`);
    console.log(`   Problematic Mappings: ${problematic.length}`);
    console.log(`   Unmapped Entity Fields: ${entityUnmapped.length}`);

    if (problematic.length === 0 && unmapped.length === 0 && csvUnmapped.length === 0) {
      console.log('\n   ✅ TODO BIEN - No hay problemas de mapeo');
    } else {
      console.log('\n   ❌ HAY PROBLEMAS - Ver detalles arriba');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error durante auditoría:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
