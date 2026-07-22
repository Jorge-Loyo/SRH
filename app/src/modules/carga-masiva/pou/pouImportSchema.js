// Largos máximos reflejan @Column({ length }) de app/src/entities-class/Pou.ts
const MAX_LENGTH = {
  sigla: 10,
  descripcion_sigla: 100,
  perfil: 50,
  especialidad: 100,
};

function validatePouRow(row) {
  const errors = [];

  if (!row.sigla) errors.push({ campo: 'sigla', motivo: 'Sigla vacía' });
  if (!row.perfil) errors.push({ campo: 'perfil', motivo: 'Perfil vacío' });
  if (!row.especialidad) errors.push({ campo: 'especialidad', motivo: 'Especialidad vacía' });

  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    const value = row[field];
    if (value !== null && value !== undefined && String(value).length > max) {
      errors.push({
        campo: field,
        motivo: `Excede el largo máximo (${max}): "${String(value).slice(0, 40)}..."`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePouRow, MAX_LENGTH };
