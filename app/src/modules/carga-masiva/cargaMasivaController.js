const { AppDataSource } = require('../../config/data-source');
const { Persona } = require('../../entities-class/Persona');
const { Cargo } = require('../../entities-class/Cargo');
const { Rol } = require('../../entities-class/Rol');
const { Sigla } = require('../../entities-class/Sigla');
const { AuditLog } = require('../../entities-class/AuditLog');
const { parseDotacionFile } = require('./dotacionFileParser');
const { validateRow, getRowWarnings } = require('./dotacionImportSchema');
const { buildDiff, FIELDS_BY_ENTITY, strongKey, weakKey } = require('./dotacionDiffEngine');
const { createIdAllocator } = require('./dotacionIdAllocator');
const { savePreview, getPreview, discardPreview } = require('./previewStore');
const { IGNORED_HEADERS } = require('./dotacionColumnMapping');
const logger = require('../../utils/logger');

const PERIODO_REGEX = /^\d{4}-\d{2}$/;
const PREVIEW_SAMPLE_LIMIT = 500;

function summarize(diff, invalidRows, warningRows) {
  return {
    nuevos: diff.nuevos.length,
    modificados: diff.modificados.length,
    sinCambios: diff.sinCambios.length,
    eliminados: diff.eliminados.length,
    siglasNuevas: diff.siglas.nuevas.length,
    siglasModificadas: diff.siglas.modificadas.length,
    filasInvalidas: invalidRows.length,
    advertencias: warningRows.length,
  };
}

async function preview(req, res) {
  try {
    const periodo = String(req.body.periodo || '').trim();
    if (!PERIODO_REGEX.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato esperado: YYYY-MM)' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Falta el archivo' });
    }

    const parsed = await parseDotacionFile(req.file.buffer);

    const structurallyValidRows = [];
    const invalidRows = [];
    for (const row of parsed.rows) {
      const { valid, errors } = validateRow(row);
      if (valid) structurallyValidRows.push(row);
      else invalidRows.push({ rowNumber: row.rowNumber, cuil: row.cuil, errores: errors });
    }

    // Fila duplicada dentro del mismo archivo: lo que no se puede repetir es
    // el ID SIAL (Rol.codigo_rol), que es el identificador real que asigna el
    // sistema origen para "un puesto ocupado". Si dos filas comparten ID SIAL
    // no hay forma de saber cuál es la correcta, así que se excluyen ambas y
    // se reportan para que se corrija el archivo. Si a una fila le falta el
    // ID SIAL (no debería pasar, pero por las dudas) se usa CUIL+cargo como
    // respaldo para el chequeo de duplicados.
    const rowsByKey = new Map();
    for (const row of structurallyValidRows) {
      const key = strongKey(row.rol.codigo_rol) || weakKey(row.cuil, row.cargo.codigo_cargo);
      if (!rowsByKey.has(key)) rowsByKey.set(key, []);
      rowsByKey.get(key).push(row);
    }
    const validRows = [];
    for (const rowsForKey of rowsByKey.values()) {
      if (rowsForKey.length === 1) {
        validRows.push(rowsForKey[0]);
      } else {
        for (const row of rowsForKey) {
          invalidRows.push({
            rowNumber: row.rowNumber,
            cuil: row.cuil,
            errores: [{ campo: 'rol.codigo_rol', motivo: `Fila duplicada: mismo ID SIAL que la(s) fila(s) ${rowsForKey.filter((r) => r !== row).map((r) => r.rowNumber).join(', ')}` }],
          });
        }
      }
    }

    const warningRows = [];
    for (const row of validRows) {
      const warnings = getRowWarnings(row, periodo);
      if (warnings.length > 0) {
        warningRows.push({ rowNumber: row.rowNumber, cuil: row.cuil, advertencias: warnings });
      }
    }

    const diff = await buildDiff({ manager: AppDataSource.manager, periodo, rows: validRows });

    const uploadId = savePreview({
      periodo,
      filename: req.file.originalname,
      adminUsername: req.user.username,
      validRows,
      diff,
      createdAt: Date.now(),
    });

    return res.json({
      uploadId,
      periodo,
      archivo: req.file.originalname,
      resumen: summarize(diff, invalidRows, warningRows),
      columnasNoMapeadas: IGNORED_HEADERS,
      columnasFaltantesEnArchivo: parsed.missingHeaders,
      columnasDesconocidasEnArchivo: parsed.unknownHeaders,
      filasInvalidas: invalidRows.slice(0, PREVIEW_SAMPLE_LIMIT),
      advertencias: warningRows.slice(0, PREVIEW_SAMPLE_LIMIT),
      modificados: diff.modificados.slice(0, PREVIEW_SAMPLE_LIMIT).map((m) => ({
        entryKey: m.key,
        cuil: m.row.cuil,
        nombre: m.row.persona.nombre_apellido,
        cargo: m.row.cargo.codigo_cargo,
        cambios: m.fieldDiffs,
      })),
      eliminados: diff.eliminados.slice(0, PREVIEW_SAMPLE_LIMIT).map((e) => ({
        entryKey: e.key,
        cuil: String(e.persona.cuil),
        nombre: e.persona.nombre_apellido,
        cargo: e.cargo?.codigo_cargo || null,
      })),
    });
  } catch (err) {
    logger.error('[cargaMasivaController] preview', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Error procesando el archivo', detail: err.message });
  }
}

function buildEntityPayload(entity, base, source) {
  const payload = { ...base };
  for (const field of FIELDS_BY_ENTITY[entity]) payload[field] = source[field] ?? null;
  return payload;
}

async function upsertChunked(manager, Entity, values, overwriteColumns, conflictColumns, chunkSize = 500) {
  if (values.length === 0) return;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await manager
      .createQueryBuilder()
      .insert()
      .into(Entity)
      .values(chunk)
      .orUpdate(overwriteColumns, conflictColumns)
      .execute();
  }
}

async function deleteByIdsInPeriodo(manager, Entity, pkColumn, periodo, ids, chunkSize = 1000) {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await manager
      .createQueryBuilder()
      .delete()
      .from(Entity)
      .where(`periodo = :periodo AND ${pkColumn} IN (:...chunk)`, { periodo, chunk })
      .execute();
  }
}

async function confirm(req, res) {
  const { uploadId } = req.params;
  const previewData = getPreview(uploadId);
  if (!previewData) {
    return res.status(404).json({ error: 'La vista previa expiró o no existe. Volvé a subir el archivo.' });
  }

  const resolutions = req.body.resolutions || {};
  const modificadosResolution = resolutions.modificados || {}; // entryKey -> 'nuevo' | 'actual'
  const eliminadosResolution = resolutions.eliminados || {}; // entryKey -> 'eliminar' | 'mantener'

  const { periodo, diff, validRows } = previewData;
  const usedCargoCodigos = new Set(validRows.map((r) => r.cargo.codigo_cargo));

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const manager = queryRunner.manager;
    const allocator = await createIdAllocator(manager);

    const siglasToWrite = [
      ...diff.siglas.nuevas.map((s) => s.payload),
      ...diff.siglas.modificadas.map((s) => s.payload),
    ].map((payload) => buildEntityPayload('sigla', {}, payload));

    const cargosToWrite = [];
    const personasToWrite = [];
    const rolesToWrite = [];

    const applyRow = ({ row, existingPersona, existingCargo, existingRol }) => {
      const idCargo = existingCargo ? existingCargo.id_cargo : allocator.allocate('cargo');
      const idPersona = existingPersona ? existingPersona.id_persona : allocator.allocate('persona');
      const idRol = existingRol ? existingRol.id_rol : allocator.allocate('rol');

      cargosToWrite.push(buildEntityPayload('cargo', {
        id_cargo: idCargo,
        periodo,
        estado_cargo: existingCargo ? existingCargo.estado_cargo : 'Activo',
      }, row.cargo));

      personasToWrite.push(buildEntityPayload('persona', { id_persona: idPersona, periodo }, row.persona));

      rolesToWrite.push(buildEntityPayload('rol', {
        id_rol: idRol,
        periodo,
        id_cargo: idCargo,
        id_persona: idPersona,
        id_sigla: row.sigla.id_sigla,
      }, row.rol));
    };

    for (const entry of diff.nuevos) {
      applyRow({ row: entry.row, existingPersona: null, existingCargo: entry.existingCargo, existingRol: null });
    }
    for (const entry of diff.modificados) {
      const resolution = modificadosResolution[entry.key] || 'nuevo';
      if (resolution === 'actual') continue;
      applyRow(entry);
    }
    // sinCambios: nada que escribir

    const personaIdsToDelete = [];
    const rolIdsToDelete = [];
    const cargoIdsToDelete = [];
    for (const entry of diff.eliminados) {
      const resolution = eliminadosResolution[entry.key] || 'eliminar';
      if (resolution !== 'eliminar') continue;
      personaIdsToDelete.push(entry.persona.id_persona);
      if (entry.rol) rolIdsToDelete.push(entry.rol.id_rol);
      if (entry.cargo && !usedCargoCodigos.has(entry.cargo.codigo_cargo)) {
        cargoIdsToDelete.push(entry.cargo.id_cargo);
      }
    }

    // Orden por FKs: borrar hijos antes que padres, insertar padres antes que hijos
    await deleteByIdsInPeriodo(manager, Rol, 'id_rol', periodo, rolIdsToDelete);
    await deleteByIdsInPeriodo(manager, Persona, 'id_persona', periodo, personaIdsToDelete);
    await deleteByIdsInPeriodo(manager, Cargo, 'id_cargo', periodo, cargoIdsToDelete);

    await upsertChunked(manager, Sigla, siglasToWrite, FIELDS_BY_ENTITY.sigla, ['id_sigla']);
    await upsertChunked(manager, Cargo, cargosToWrite, [...FIELDS_BY_ENTITY.cargo, 'estado_cargo'], ['id_cargo', 'periodo']);
    await upsertChunked(manager, Persona, personasToWrite, FIELDS_BY_ENTITY.persona, ['id_persona', 'periodo']);
    await upsertChunked(manager, Rol, rolesToWrite, [...FIELDS_BY_ENTITY.rol, 'id_cargo', 'id_persona', 'id_sigla'], ['id_rol', 'periodo']);

    const resultado = {
      periodo,
      siglas: siglasToWrite.length,
      cargos: cargosToWrite.length,
      personas: personasToWrite.length,
      roles: rolesToWrite.length,
      eliminados: personaIdsToDelete.length,
    };

    await manager.getRepository(AuditLog).save({
      user_username: req.user.username,
      user_role: req.user.role,
      source: 'admin',
      action: 'bulk_import',
      resource: `dotacion:${periodo}`,
      record_id: periodo,
      method: 'POST',
      path: req.originalUrl,
      status: 200,
      changes: JSON.stringify({ archivo: previewData.filename, ...resultado }),
    });

    await queryRunner.commitTransaction();
    discardPreview(uploadId);

    return res.json({ ok: true, resultado });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    logger.error('[cargaMasivaController] confirm', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Error al escribir la carga', detail: err.message });
  } finally {
    await queryRunner.release();
  }
}

async function discard(req, res) {
  discardPreview(req.params.uploadId);
  return res.json({ ok: true });
}

module.exports = { preview, confirm, discard };
