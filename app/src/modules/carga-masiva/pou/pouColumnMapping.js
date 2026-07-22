/**
 * Mapeo de columnas de la hoja "Base" del archivo de ocupación POU
 * (ej. "Ocupacion_POU_13-07.xlsx") hacia app/src/entities-class/Pou.ts.
 *
 * El archivo trae 5 hojas; sólo "Base" es la fuente (verificado: 0 filas
 * duplicadas por SIGLA+PERFIL+ESPECIALIDAD, y sus columnas 1-10 calzan
 * exacto con los campos de Pou). Las otras 4 hojas son detalle persona por
 * persona, resúmenes o reportes de diferencias entre períodos — no se leen.
 *
 * Las columnas 11-14 (En proceso concursal, Dotación SG Total, Sg Activos,
 * la segunda columna "Vacantes") quedan afuera por decisión explícita.
 */

const SHEET_NAME = 'Base';

const COLUMN_MAPPING = [
  { headers: ['SIGLA'], field: 'sigla', type: 'string' },
  { headers: ['Descrip. Sigla'], field: 'descripcion_sigla', type: 'string' },
  { headers: ['PERFIL'], field: 'perfil', type: 'string' },
  { headers: ['ESPECIALIDAD'], field: 'especialidad', type: 'string' },
  { headers: ['Dotación Diaria'], field: 'dotacion_diaria', type: 'int' },
  { headers: ['Dotación Sem'], field: 'dotacion_sem', type: 'int' },
  { headers: ['Dotación Total'], field: 'dotacion_total', type: 'int' },
  { headers: ['Activos'], field: 'activos', type: 'int' },
  { headers: ['Técnicos'], field: 'tecnicos', type: 'int' },
  // "Vacantes" aparece 2 veces en el archivo (col. 10, la que va acá, y
  // col. 14, que es una de las 4 excluidas) — occurrence:1 toma la primera.
  { headers: ['Vacantes'], field: 'vacantes', type: 'int', occurrence: 1 },
];

module.exports = { SHEET_NAME, COLUMN_MAPPING };
