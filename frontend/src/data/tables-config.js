/**
 * Configuración de tablas para el frontend (ESM).
 * Refleja app/src/components/tablas_full/tables-config.js
 * Solo incluye lo necesario para la UI: labels, filtros, config de tabla.
 */

export const FILTER_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  NUMBER_RANGE: 'number_range',
  DATE: 'date',
  DATE_RANGE: 'date_range',
  MULTI_SELECT: 'multi_select',
  BOOLEAN: 'boolean',
  LIKE: 'like',
};

export const TABLES_CONFIG = {
  personas: {
    key: 'personas',
    label: 'Personas',
    description: 'Vista completa de personas',
    defaultSort: { column: 'id_persona', direction: 'ASC' },
    defaultPerPage: 50,
    hasPeriodo: true,
    filters: [
      { field: 'id_persona',      label: 'ID Persona',   type: FILTER_TYPES.TEXT,         placeholder: 'Ej: 12345' },
      { field: 'codigo_persona',  label: 'Cód. Persona', type: FILTER_TYPES.LIKE,         placeholder: 'Buscar código' },
      { field: 'cuil',            label: 'CUIL',         type: FILTER_TYPES.LIKE,         placeholder: 'Buscar CUIL' },
      { field: 'cuil_rol',        label: 'CUIL Rol',     type: FILTER_TYPES.LIKE,         placeholder: 'Buscar CUIL Rol' },
      { field: 'nombre',          label: 'Nombre',       type: FILTER_TYPES.LIKE,         placeholder: 'Buscar nombre' },
      { field: 'numero_doc',      label: 'Núm. Doc.',    type: FILTER_TYPES.LIKE,         placeholder: 'Buscar documento' },
      { field: 'tipo_doc',        label: 'Tipo Doc.',    type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'sexo',            label: 'Sexo',         type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'especialidad',    label: 'Especialidad', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'localidad',       label: 'Localidad',    type: FILTER_TYPES.LIKE,         placeholder: 'Buscar localidad' },
      { field: 'antiguedad',      label: 'Antigüedad',   type: FILTER_TYPES.NUMBER_RANGE },
      { field: 'edad',            label: 'Edad',         type: FILTER_TYPES.NUMBER_RANGE },
      { field: 'fecha_nacimiento',label: 'Fec. Nacimiento', type: FILTER_TYPES.DATE_RANGE },
    ],
  },

  cargos: {
    key: 'cargos',
    label: 'Cargos',
    description: 'Vista completa de cargos',
    defaultSort: { column: 'id_cargo', direction: 'ASC' },
    defaultPerPage: 50,
    hasPeriodo: true,
    filters: [
      { field: 'id_cargo',     label: 'ID Cargo',    type: FILTER_TYPES.TEXT,         placeholder: 'Ej: 12345' },
      { field: 'codigo_cargo', label: 'Cód. Cargo',  type: FILTER_TYPES.LIKE,         placeholder: 'Buscar código' },
      { field: 'estado_cargo', label: 'Estado Cargo',type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
    ],
  },

  roles: {
    key: 'roles',
    label: 'Roles',
    description: 'Vista completa de roles',
    defaultSort: { column: 'id_rol', direction: 'ASC' },
    defaultPerPage: 50,
    hasPeriodo: true,
    filters: [
      { field: 'id_rol',                   label: 'ID Rol',                 type: FILTER_TYPES.TEXT,         placeholder: 'Ej: 12345' },
      { field: 'codigo_rol',               label: 'Cód. Rol',               type: FILTER_TYPES.LIKE,         placeholder: 'Buscar código' },
      { field: 'codigo_reparticion',       label: 'Cód. Repartición',       type: FILTER_TYPES.LIKE,         placeholder: 'Buscar repartición' },
      { field: 'escalafon',                label: 'Escalafón',              type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'literal_codigo_registro',  label: 'Literal Cód. Registro',  type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'situacion_revista',        label: 'Situación Revista',      type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'literal_puesto',           label: 'Literal Puesto',         type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'unificador_puesto',        label: 'Unificador Puesto',      type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'agrupador',                label: 'Agrupador',              type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'estado',                   label: 'Estado',                 type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
    ],
  },

  siglas: {
    key: 'siglas',
    label: 'Siglas',
    description: 'Vista completa de siglas',
    defaultSort: { column: 'id_sigla', direction: 'ASC' },
    defaultPerPage: 50,
    filters: [
      { field: 'id_sigla',               label: 'ID Sigla',            type: FILTER_TYPES.TEXT,         placeholder: 'Ej: 12345' },
      { field: 'sigla',                  label: 'Sigla',               type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'universo_totalizador',   label: 'Universo Totalizador',type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'tipo_hospital_sigla',    label: 'Tipo Hospital',       type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'monovalencia',           label: 'Monovalencia',        type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
    ],
  },

  bajas: {
    key: 'bajas',
    label: 'Bajas y Concursos',
    description: 'Vista completa de bajas y concursos',
    defaultSort: { column: 'id_baja', direction: 'ASC' },
    defaultPerPage: 50,
    hasPeriodo: true,
    filters: [
      { field: 'id_baja',             label: 'ID Baja',             type: FILTER_TYPES.TEXT,         placeholder: 'Ej: 12345' },
      { field: 'sigla',               label: 'Sigla',               type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'motivo_baja',         label: 'Motivo Baja',         type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'puesto_baja',         label: 'Puesto Baja',         type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'especialidad_baja',   label: 'Especialidad Baja',   type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'unificador_puestos',  label: 'Unificador Puestos',  type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'fecha_baja',          label: 'Fecha Baja',          type: FILTER_TYPES.DATE_RANGE },
    ],
  },
};

export function getTableConfig(key) {
  return TABLES_CONFIG[key] || null;
}
