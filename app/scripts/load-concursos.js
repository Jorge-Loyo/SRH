#!/usr/bin/env node

/**
 * Script: Cargar datos de concursos desde CSV a la BD
 *
 * Uso:
 *   node scripts/load-concursos.js [archivo.csv]
 *
 * Ejemplo:
 *   node scripts/load-concursos.js Concursos.csv
 *   node scripts/load-concursos.js path/to/custom.csv
 *
 * Características:
 * - Lee archivo CSV con delimitador ";"
 * - Transforma fechas de formato D/M/YYYY a YYYY-MM-DD
 * - Convierte booleanos (VERDADERO/FALSO a true/false)
 * - Maneja valores nulos ("-" → null)
 * - Importación en lotes (batch) para optimizar performance
 * - Reporta estado de carga: creados, duplicados, errores
 * - Auditoría automática de la operación
 */

const { initDatabase, closeDatabase } = require('./lib/init-db');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ConcursoService = require('../src/services/ConcursoService');
const logger = require('../src/utils/logger');

/**
 * Parsear línea CSV respetando delimitador ";" y valores entrecomillados
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
 * Convertir valor nulo ("-") a null
 */
function parseNull(value) {
  return value === '-' || value === '' ? null : value;
}

/**
 * Convertir fecha de formato D/M/YYYY a YYYY-MM-DD
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === '') {
    return null;
  }

  try {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) {
      return null;
    }

    // Validar rango
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      return null;
    }

    // Retornar en formato YYYY-MM-DD
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`;
  } catch (err) {
    logger.warn(`[load-concursos] Failed to parse date: ${dateStr}`);
    return null;
  }
}

/**
 * Convertir booleano (VERDADERO/FALSO)
 */
function parseBoolean(value) {
  if (!value) return null;
  return value.toUpperCase() === 'VERDADERO' ? true : false;
}

/**
 * Transformar fila CSV a objeto Concurso
 */
function transformRow(headers, values) {
  const row = {};

  headers.forEach((header, index) => {
    const value = values[index] || '';

    // Mapeo de columnas CSV → entidad Concurso
    switch (header) {
      case 'ID CONCURSO':
        row.id_concurso = parseInt(value, 10);
        break;
      case 'SIGLA':
        row.sigla = parseNull(value);
        break;
      case 'ESTADO':
        row.estado = parseNull(value);
        break;
      case 'SUB ESTADO':
        row.sub_estado = parseNull(value);
        break;
      case 'EE BAJA/ AMPLIACION':
        row.ee_baja = parseNull(value);
        break;
      case 'CUIL BAJA':
        row.cuil_baja = parseNull(value);
        break;
      case 'NOMBRE BAJA':
        row.nombre_baja = parseNull(value);
        break;
      case 'FECHA BAJA':
        row.fecha_baja = parseDate(value);
        break;
      // SECCIÓN BAJA - Escalafón específico de baja
      case 'ESCALAFON BAJA':
        row.escalafon_baja = parseNull(value);
        break;
      case 'PUESTO BAJA':
        row.puesto_baja = parseNull(value);
        break;
      case 'ESPECIALIDAD BAJA':
        row.especialidad_baja = parseNull(value);
        break;
      // SECCIÓN CONCURSO - ETAPA 1: Convocatoria y Autorización
      case 'EE CONCURSO':
        row.ee_concurso = parseNull(value);
        break;
      case 'FECHA EE CONCURSO':
        row.fecha_ee_concurso = parseDate(value);
        break;
      case 'ESCALAFON CONCURSO':
        row.escalafon_concurso = parseNull(value);
        break;
      case 'PUESTO ALTA':
        row.puesto_alta = parseNull(value);
        break;
      // FIX: Nombre correcto del CSV es "ESPECIALIDAD SOLICITADA ALTA" (sin "DE")
      case 'ESPECIALIDAD SOLICITADA ALTA':
        row.especialidad_solicitada_de_alta = parseNull(value);
        break;
      case 'FECHA AUTORIZACION':
        row.fecha_autorizacion = parseDate(value);
        break;
      case 'SORTEO DE JURADO':
        row.sorteo_de_jurado = parseBoolean(value);
        break;
      // SECCIÓN CONCURSO - ETAPA 2: Inscripción y Evaluación
      case 'DISPOSICION CONCURSO':
        row.disposicion_concurso = parseNull(value);
        break;
      case 'FECHA DESDE':
        row.fecha_desde = parseDate(value);
        break;
      case 'FECHA HASTA':
        row.fecha_hasta = parseDate(value);
        break;
      case 'FECHA EXAMEN':
        row.fecha_examen = parseDate(value);
        break;
      case 'ORDEN DE MERITO':
        row.orden_merito = parseNull(value);
        break;
      case 'FECHA ORDEN DE MERITO':
        row.fecha_orden_merito = parseDate(value);
        break;
      // SECCIÓN DESIGNACIÓN - Información del Designado
      case 'EE DESIGNACION':
        row.expediente_designacion = parseNull(value);
        break;
      case 'FECHA EE DESIGNACION':
        row.fecha_expediente_designacion = parseDate(value);
        break;
      case 'NOMBRE DESIGNACION':
        row.nombre_designacion = parseNull(value);
        break;
      case 'CUIL DESIGNACION':
        row.cuil_designacion = parseNull(value);
        break;
      case 'FECHA APTO MEDICO':
        row.fecha_apto_medico = parseDate(value);
        break;
      // SECCIÓN DESIGNACIÓN - Formalización
      case 'RESOLUCION DE DESIGNACIÓN':
        row.resolucion_designacion = parseNull(value);
        break;
      case 'FECHA RESOLUCION':
        row.fecha_resolucion = parseDate(value);
        break;
      // OTROS CAMPOS
      case 'OBSERVACIONES':
        row.observaciones = parseNull(value);
        break;
      case 'CODIGO CARGO':
        row.codigo_cargo = parseNull(value);
        break;
      case 'RECORRIDAS':
        row.recorridas = parseNull(value);
        break;
      case 'ORIGEN':
        row.origen = parseNull(value);
        break;
      default:
        // Ignorar columnas desconocidas
        break;
    }
  });

  return row;
}

/**
 * Leer CSV línea por línea y retornar array de objetos
 */
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const rows = [];
    let headers = [];
    let lineNumber = 0;

    rl.on('line', (line) => {
      lineNumber++;

      // Parsear encabezados en primera línea
      if (lineNumber === 1) {
        headers = parseCSVLine(line);
        console.log(`📋 Headers detected (${headers.length} columns):`);
        headers.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
        return;
      }

      // Transformar datos
      try {
        const values = parseCSVLine(line);
        const row = transformRow(headers, values);
        rows.push(row);
      } catch (err) {
        console.error(
          `❌ Error parsing line ${lineNumber}: ${err.message}`
        );
      }
    });

    rl.on('end', () => {
      console.log(`✅ CSV loaded: ${rows.length} rows`);
      resolve(rows);
    });

    rl.on('error', reject);
  });
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando carga de concursos desde CSV...\n');

  // Obtener ruta del archivo CSV
  const csvFile = process.argv[2] || 'Concursos.csv';
  const csvPath = path.resolve(__dirname, '..', csvFile);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Archivo no encontrado: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂 Archivo: ${csvPath}\n`);

  try {
    // Inicializar TypeORM
    console.log('🔧 Inicializando base de datos...');
    const dataSource = await initDatabase();
    console.log('✅ Base de datos conectada\n');

    // Leer CSV
    console.log('📖 Leyendo archivo CSV...');
    const concursos = await readCSV(csvPath);
    console.log(`✅ ${concursos.length} registros leídos\n`);

    // Validaciones básicas
    console.log('🔍 Validando datos...');
    let validCount = 0;
    let invalidCount = 0;

    for (const concurso of concursos) {
      if (!concurso.id_concurso) {
        console.warn(`  ⚠️  Registro sin id_concurso:`, concurso);
        invalidCount++;
      } else {
        validCount++;
      }
    }

    console.log(
      `✅ Validación completada: ${validCount} válidos, ${invalidCount} inválidos\n`
    );

    if (validCount === 0) {
      console.error(
        '❌ No hay registros válidos para cargar. Abortando...'
      );
      process.exit(1);
    }

    // Cargar en BD
    console.log('💾 Importando concursos a la base de datos...');
    const concursoService = new ConcursoService();

    const { created, skipped, errors } = await concursoService.bulkCreate(
      concursos,
      { skipDuplicates: true }
    );

    console.log(`\n✅ Carga completada:`);
    console.log(`  - Creados: ${created}`);
    console.log(`  - Duplicados (saltados): ${skipped}`);
    console.log(`  - Errores: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ Errores encontrados (primeros 10):`);
      errors.slice(0, 10).forEach((err) => {
        console.log(`  - ID ${err.id_concurso}: ${err.error}`);
      });

      if (errors.length > 10) {
        console.log(`  ... y ${errors.length - 10} errores más`);
      }
    }

    console.log(`\n🎉 Proceso finalizado exitosamente`);
  } catch (error) {
    console.error('❌ Error durante la carga:', error.message);
    logger.error('[load-concursos] Fatal error', { error: error.message });
    process.exit(1);
  } finally {
    const dataSource = await initDatabase();
    await closeDatabase(dataSource);
  }
}

// Ejecutar
main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
