const { AppDataSource } = require('../../../config/data-source');
const { Pou } = require('../../../entities-class/Pou');
const { AuditLog } = require('../../../entities-class/AuditLog');
const { parsePouFile } = require('./pouFileParser');
const { validatePouRow } = require('./pouImportSchema');
const { buildPouDiff, rowKey, FIELDS } = require('./pouDiffEngine');
const { savePreview, getPreview, discardPreview } = require('../previewStore');
const logger = require('../../../utils/logger');

const PERIODO_REGEX = /^\d{4}-\d{2}$/;
const PREVIEW_SAMPLE_LIMIT = 500;

function summarize(diff, invalidRows) {
  return {
    nuevos: diff.nuevos.length,
    modificados: diff.modificados.length,
    sinCambios: diff.sinCambios.length,
    eliminados: diff.eliminados.length,
    filasInvalidas: invalidRows.length,
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

    const parsed = await parsePouFile(req.file.buffer);

    const structurallyValidRows = [];
    const invalidRows = [];
    for (const row of parsed.rows) {
      const { valid, errors } = validatePouRow(row.pou);
      if (valid) structurallyValidRows.push(row);
      else invalidRows.push({ rowNumber: row.rowNumber, sigla: row.pou.sigla, errores: errors });
    }

    // Fila duplicada dentro del mismo archivo (misma sigla+perfil+especialidad
    // repetida): no hay forma de saber cuál es la correcta.
    const rowsByKey = new Map();
    for (const row of structurallyValidRows) {
      const key = rowKey(row.pou);
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
            sigla: row.pou.sigla,
            errores: [{ campo: 'sigla+perfil+especialidad', motivo: `Fila duplicada: misma combinación que la(s) fila(s) ${rowsForKey.filter((r) => r !== row).map((r) => r.rowNumber).join(', ')}` }],
          });
        }
      }
    }

    const diff = await buildPouDiff({ manager: AppDataSource.manager, periodo, rows: validRows });

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
      resumen: summarize(diff, invalidRows),
      columnasFaltantesEnArchivo: parsed.missingHeaders,
      filasInvalidas: invalidRows.slice(0, PREVIEW_SAMPLE_LIMIT),
      modificados: diff.modificados.slice(0, PREVIEW_SAMPLE_LIMIT).map((m) => ({
        entryKey: m.key,
        sigla: m.pou.sigla,
        perfil: m.pou.perfil,
        especialidad: m.pou.especialidad,
        cambios: m.fieldDiffs,
      })),
      eliminados: diff.eliminados.slice(0, PREVIEW_SAMPLE_LIMIT).map((e) => ({
        entryKey: e.key,
        sigla: e.existingRow.sigla,
        perfil: e.existingRow.perfil,
        especialidad: e.existingRow.especialidad,
      })),
    });
  } catch (err) {
    logger.error('[pouController] preview', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Error procesando el archivo', detail: err.message });
  }
}

async function upsertChunked(manager, values, chunkSize = 500) {
  if (values.length === 0) return;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await manager
      .createQueryBuilder()
      .insert()
      .into(Pou)
      .values(chunk)
      .orUpdate(FIELDS, ['id', 'periodo'])
      .execute();
  }
}

async function deleteByIds(manager, periodo, ids, chunkSize = 1000) {
  if (ids.length === 0) return;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await manager
      .createQueryBuilder()
      .delete()
      .from(Pou)
      .where('periodo = :periodo AND id IN (:...chunk)', { periodo, chunk })
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

  const { periodo, diff } = previewData;

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const manager = queryRunner.manager;

    const maxIdResult = await manager.createQueryBuilder(Pou, 't').select('MAX(t.id)', 'max').getRawOne();
    let nextId = Number(maxIdResult?.max || 0) + 1;

    const toWrite = [];
    for (const entry of diff.nuevos) {
      toWrite.push({ id: nextId++, periodo, ...entry.pou });
    }
    for (const entry of diff.modificados) {
      const resolution = modificadosResolution[entry.key] || 'nuevo';
      if (resolution === 'actual') continue;
      toWrite.push({ id: entry.existingRow.id, periodo, ...entry.pou });
    }

    const idsToDelete = [];
    for (const entry of diff.eliminados) {
      const resolution = eliminadosResolution[entry.key] || 'eliminar';
      if (resolution !== 'eliminar') continue;
      idsToDelete.push(entry.existingRow.id);
    }

    await deleteByIds(manager, periodo, idsToDelete);
    await upsertChunked(manager, toWrite);

    const resultado = {
      periodo,
      escritos: toWrite.length,
      eliminados: idsToDelete.length,
    };

    await manager.getRepository(AuditLog).save({
      user_username: req.user.username,
      user_role: req.user.role,
      source: 'admin',
      action: 'bulk_import',
      resource: `pou:${periodo}`,
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
    logger.error('[pouController] confirm', { error: err.message, stack: err.stack });
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
