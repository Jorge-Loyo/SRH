/**
 * Validación de filas del import de dotación.
 *
 * A propósito NO reutiliza los schemas Zod estrictos de app/src/schemas/index.js
 * (esos son para un formulario donde un humano tipea un registro a la vez, con
 * reglas de negocio como "edad entre 18 y 100" o "email con formato válido").
 * Acá la fuente es un extracto de un sistema externo que se asume autoritativo:
 * lo único que puede romper la carga es un dato faltante para las FKs/claves
 * naturales, o un valor que no entra en la columna varchar de destino.
 *
 * Los largos máximos reflejan @Column({ length }) de
 * app/src/entities-class/{Sigla,Cargo,Persona,Rol}.ts — si esas entidades
 * cambian, actualizar acá también.
 */

const MAX_LENGTH = {
  sigla: {
    sigla: 20,
    universo_totalizador: 50,
    tipo_hospital_sigla: 100,
    monovalencia: 100,
  },
  cargo: {
    codigo_cargo: 20,
  },
  persona: {
    codigo_persona: 20,
    cuil_rol: 20,
    nombre_apellido: 100,
    fecha_nacimiento: 15,
    sexo: 15,
    tipo_doc: 10,
    especialidad: 100,
    telefono: 15,
    mail_personal: 200,
    mail_laboral: 200,
    domicilio: 200,
    localidad: 200,
    antiguedad: 15,
  },
  rol: {
    codigo_rol: 20,
    descripcion_reparticion: 200,
    escalafon: 50,
    codigo_registro: 5,
    literal_codigo_registro: 100,
    situacion_revista: 50,
    literal_puesto: 100,
    unificador_puesto: 100,
    agrupador: 50,
    j_categoria: 20,
    jefaturas: 50,
    escritorio: 10,
    pou_desde: 15,
    dia: 20,
    fecha_bloqueo: 15,
    bloqueo_motivo: 100,
    bloqueo_comentario: 200,
    cargo_desde: 15,
    cargo_hasta: 15,
    puesto: 50,
    codigo_agrupamiento: 20,
    literal_agrupamiento: 100,
    doc_respaldatoria_j_categoria: 100,
    j_comentario: 250,
    comision_repa: 15,
    descripcion_repa_comision: 200,
    documentacion_alta: 100,
    documentacion_baja: 100,
    estado: 50,
  },
};

const REQUIRED = [
  { entity: 'persona', field: 'cuil', motivo: 'CUIL vacío' },
  { entity: 'persona', field: 'nombre_apellido', motivo: 'Nombre y apellido vacío' },
  { entity: 'persona', field: 'tipo_doc', motivo: 'Tipo de documento vacío' },
  { entity: 'persona', field: 'numero_doc', motivo: 'Número de documento vacío' },
  { entity: 'cargo', field: 'codigo_cargo', motivo: 'Código de cargo vacío' },
  { entity: 'sigla', field: 'id_sigla', motivo: 'ID de sigla vacío' },
  { entity: 'sigla', field: 'sigla', motivo: 'Sigla vacía' },
  // Estos campos de Rol son NOT NULL en la entidad (Rol.ts) — si vienen
  // vacíos, el INSERT final rompe. Se valida acá para avisar antes.
  { entity: 'rol', field: 'codigo_reparticion', motivo: 'Código repartición vacío' },
  { entity: 'rol', field: 'descripcion_reparticion', motivo: 'Descripción repartición vacía' },
  { entity: 'rol', field: 'escalafon', motivo: 'Escalafón vacío' },
  { entity: 'rol', field: 'literal_codigo_registro', motivo: 'Literal código registro vacío' },
  { entity: 'rol', field: 'situacion_revista', motivo: 'Situación de revista vacía' },
  { entity: 'rol', field: 'literal_puesto', motivo: 'Literal puesto vacío' },
  { entity: 'rol', field: 'unificador_puesto', motivo: 'Unificador de puesto vacío' },
  { entity: 'rol', field: 'agrupador', motivo: 'Agrupador vacío' },
];

function validateRow(row) {
  const errors = [];

  for (const { entity, field, motivo } of REQUIRED) {
    const value = row[entity]?.[field];
    if (value === null || value === undefined || value === '') {
      errors.push({ campo: `${entity}.${field}`, motivo });
    }
  }

  const cuilDigits = String(row.persona?.cuil || '').replace(/\D/g, '');
  if (cuilDigits && (cuilDigits.length < 10 || cuilDigits.length > 11)) {
    errors.push({ campo: 'persona.cuil', motivo: `CUIL con formato inválido: "${row.persona.cuil}"` });
  }

  for (const [entity, fields] of Object.entries(MAX_LENGTH)) {
    for (const [field, max] of Object.entries(fields)) {
      const value = row[entity]?.[field];
      if (value !== null && value !== undefined && String(value).length > max) {
        errors.push({
          campo: `${entity}.${field}`,
          motivo: `Excede el largo máximo (${max}): "${String(value).slice(0, 40)}..."`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SEXO_VALIDOS = ['M', 'F', 'X', 'NB'];

function calcAge(birthDateStr, referenceDateStr) {
  const [by, bm, bd] = birthDateStr.split('-').map(Number);
  const [ry, rm, rd] = referenceDateStr.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age--;
  return age;
}

/**
 * Advertencias NO bloqueantes: la fila se importa igual, pero se le avisa al
 * admin porque el dato "huele mal" (posible error de tipeo en el sistema
 * origen). A diferencia de validateRow(), esto no impide la carga.
 *
 * @param {string} periodo - 'YYYY-MM', se usa como fecha de referencia para
 *   comparar FECHA NACIMIENTO contra EDAD.
 */
function getRowWarnings(row, periodo) {
  const warnings = [];

  const edad = row.persona?.edad;
  if (typeof edad === 'number' && (edad < 16 || edad > 90)) {
    warnings.push({ campo: 'persona.edad', motivo: `Edad fuera de rango esperado: ${edad}` });
  }

  const cuilDigits = String(row.persona?.cuil || '').replace(/\D/g, '');
  const dniDigits = String(row.persona?.numero_doc || '').replace(/\D/g, '');
  if (cuilDigits.length === 11 && dniDigits) {
    const cuilDni = cuilDigits.slice(2, 10).replace(/^0+/, '');
    const dni = dniDigits.replace(/^0+/, '');
    if (cuilDni !== dni) {
      warnings.push({
        campo: 'persona.numero_doc',
        motivo: `El número de documento (${row.persona.numero_doc}) no coincide con el CUIL (${row.persona.cuil})`,
      });
    }
  }

  for (const field of ['mail_personal', 'mail_laboral']) {
    const value = row.persona?.[field];
    if (value && !EMAIL_REGEX.test(value)) {
      warnings.push({ campo: `persona.${field}`, motivo: `Formato de email dudoso: "${value}"` });
    }
  }

  const fechaNacimiento = row.persona?.fecha_nacimiento;
  if (typeof edad === 'number' && fechaNacimiento && ISO_DATE_REGEX.test(fechaNacimiento) && periodo) {
    const edadCalculada = calcAge(fechaNacimiento, `${periodo}-15`);
    if (Math.abs(edadCalculada - edad) > 1) {
      warnings.push({
        campo: 'persona.fecha_nacimiento',
        motivo: `La fecha de nacimiento (${fechaNacimiento}) da una edad de ${edadCalculada}, pero EDAD dice ${edad}`,
      });
    }
  }

  const cargoDesde = row.rol?.cargo_desde;
  const cargoHasta = row.rol?.cargo_hasta;
  if (
    cargoDesde && cargoHasta
    && ISO_DATE_REGEX.test(cargoDesde) && ISO_DATE_REGEX.test(cargoHasta)
    && Number(cargoHasta.slice(0, 4)) < 4000 // sentinel de "sigue activo", no es una fecha real
    && cargoHasta < cargoDesde
  ) {
    warnings.push({
      campo: 'rol.cargo_hasta',
      motivo: `CARGO_HASTA (${cargoHasta}) es anterior a CARGO_DESDE (${cargoDesde})`,
    });
  }

  const sexo = row.persona?.sexo;
  if (sexo && !SEXO_VALIDOS.includes(String(sexo).trim().toUpperCase())) {
    warnings.push({ campo: 'persona.sexo', motivo: `Valor de sexo inesperado: "${sexo}"` });
  }

  return warnings;
}

module.exports = { validateRow, getRowWarnings, MAX_LENGTH };
