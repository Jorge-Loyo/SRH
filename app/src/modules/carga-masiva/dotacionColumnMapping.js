/**
 * Mapeo de columnas del archivo maestro de dotación ("DOTACION CON SIGLAS.xlsx")
 * hacia los campos de las entidades Sigla/Cargo/Persona/Rol.
 *
 * Confirmado contra el archivo real (61 columnas, fila 1 = headers), contra
 * app/src/entities-class/{Sigla,Cargo,Persona,Rol}.ts, y contra los
 * parámetros históricos de corte manual en Contexto/JSONS/*.json.
 *
 * Cada entrada: { headers, entity, field, type, transform? }
 * - headers: lista de nombres de columna aceptados para ese campo (el primero
 *   es el "canónico" a mostrar en mensajes). GCBA ya renombró una columna de
 *   un mes a otro (CODIGO CARGO -> ID CARGO) sin avisar — soportar alias evita
 *   que una carga se rompa entera por un rename de este tipo.
 * - entity: 'sigla' | 'cargo' | 'persona' | 'rol'
 * - field: nombre del campo en la entidad TypeORM
 *
 * Headers sin entrada acá (ver IGNORED_HEADERS) no tienen campo equivalente
 * hoy en la BD — decisión explícita: se ignoran en esta versión, no bloquean
 * el import, y se listan en el resumen de preview.
 */

const COLUMN_MAPPING = [
  { headers: ['ID_SIGLA'], entity: 'sigla', field: 'id_sigla', type: 'int' },
  { headers: ['ID CARGO', 'CODIGO CARGO'], entity: 'cargo', field: 'codigo_cargo', type: 'string' },
  // ID SIAL es el identificador estable que usa el sistema origen (GCBA) —
  // se reutiliza en dos entidades con distinto recorte, igual que en el
  // proceso manual de hoy (ver Contexto/JSONS/{PERSONAS,ROLES}.json):
  // primeros 9 caracteres como código de persona, valor completo como código de rol.
  { headers: ['ID SIAL'], entity: 'persona', field: 'codigo_persona', type: 'string', transform: { slice: [1, 9] } },
  { headers: ['ID SIAL'], entity: 'rol', field: 'codigo_rol', type: 'string' },
  { headers: ['CUIL'], entity: 'persona', field: 'cuil', type: 'string' },
  { headers: ['CUIL Y ROL'], entity: 'persona', field: 'cuil_rol', type: 'string' },
  { headers: ['AYN'], entity: 'persona', field: 'nombre_apellido', type: 'string' },
  { headers: ['FECHA NACIMIENTO'], entity: 'persona', field: 'fecha_nacimiento', type: 'date' },
  { headers: ['EDAD'], entity: 'persona', field: 'edad', type: 'int' },
  { headers: ['SEXO'], entity: 'persona', field: 'sexo', type: 'string' },
  { headers: ['TIPO DOC'], entity: 'persona', field: 'tipo_doc', type: 'string' },
  { headers: ['NUMERO DOC'], entity: 'persona', field: 'numero_doc', type: 'string' },
  { headers: ['CODIGO REPA'], entity: 'rol', field: 'codigo_reparticion', type: 'int' },
  { headers: ['DESCRIPCION REPA'], entity: 'rol', field: 'descripcion_reparticion', type: 'string' },
  { headers: ['SIGLA'], entity: 'sigla', field: 'sigla', type: 'string' },
  { headers: ['UNIVERSO TOTALIZADOR'], entity: 'sigla', field: 'universo_totalizador', type: 'string' },
  { headers: ['TIPO DE HOSPITAL / SIGLA'], entity: 'sigla', field: 'tipo_hospital_sigla', type: 'string' },
  { headers: ['MONOVALENCIA'], entity: 'sigla', field: 'monovalencia', type: 'string' },
  { headers: ['ESCALAFON'], entity: 'rol', field: 'escalafon', type: 'string' },
  { headers: ['CODIGO DE REGISTRO'], entity: 'rol', field: 'codigo_registro', type: 'string' },
  { headers: ['LITERAL CR'], entity: 'rol', field: 'literal_codigo_registro', type: 'string' },
  { headers: ['SITUACION DE REVISTA'], entity: 'rol', field: 'situacion_revista', type: 'string' },
  { headers: ['PUESTO'], entity: 'rol', field: 'puesto', type: 'string' },
  { headers: ['LITERAL PUESTO'], entity: 'rol', field: 'literal_puesto', type: 'string' },
  { headers: ['ESPECIALIDAD'], entity: 'persona', field: 'especialidad', type: 'string' },
  { headers: ['UNIFICADOR DE PUESTOS'], entity: 'rol', field: 'unificador_puesto', type: 'string' },
  { headers: ['AGRUPADOR'], entity: 'rol', field: 'agrupador', type: 'string' },
  { headers: ['CODIGO JEFATURAS'], entity: 'rol', field: 'j_categoria', type: 'string' },
  { headers: ['JEFE ESCALAFON'], entity: 'rol', field: 'jefaturas', type: 'string' },
  { headers: ['DOCUMENTACION JEFATURA'], entity: 'rol', field: 'doc_respaldatoria_j_categoria', type: 'string' },
  { headers: ['COMENTARIOS JEFATURAS'], entity: 'rol', field: 'j_comentario', type: 'string' },
  { headers: ['ESCRITORIO'], entity: 'rol', field: 'escritorio', type: 'string' },
  { headers: ['POU_DESDE'], entity: 'rol', field: 'pou_desde', type: 'date' },
  { headers: ['DIA'], entity: 'rol', field: 'dia', type: 'string' },
  { headers: ['COMISION'], entity: 'rol', field: 'comision_repa', type: 'date' },
  { headers: ['REPA COMISION'], entity: 'rol', field: 'descripcion_repa_comision', type: 'string' },
  { headers: ['COD_AGRUPAMIENTO'], entity: 'rol', field: 'codigo_agrupamiento', type: 'string' },
  { headers: ['AGRUPAMIENTO'], entity: 'rol', field: 'literal_agrupamiento', type: 'string' },
  { headers: ['TELEFONO'], entity: 'persona', field: 'telefono', type: 'string', transform: { strip: ['+', ' '] } },
  { headers: ['MAIL_PERSONAL'], entity: 'persona', field: 'mail_personal', type: 'string' },
  { headers: ['MAIL_LABORAL'], entity: 'persona', field: 'mail_laboral', type: 'string' },
  { headers: ['DOMICILIO'], entity: 'persona', field: 'domicilio', type: 'string' },
  { headers: ['LOCALIDAD'], entity: 'persona', field: 'localidad', type: 'string' },
  { headers: ['FECHA BLOQUEO'], entity: 'rol', field: 'fecha_bloqueo', type: 'date' },
  { headers: ['BLOQUEO COMENTARIO'], entity: 'rol', field: 'bloqueo_comentario', type: 'string' },
  { headers: ['BLOQ MOTIVO'], entity: 'rol', field: 'bloqueo_motivo', type: 'string' },
  { headers: ['CARGO_DESDE'], entity: 'rol', field: 'cargo_desde', type: 'date' },
  { headers: ['CARGO_HASTA'], entity: 'rol', field: 'cargo_hasta', type: 'date' },
  { headers: ['DOCUMENTACION DEL ROL'], entity: 'rol', field: 'documentacion_alta', type: 'string' },
  { headers: ['DOCUMENTACION BAJA'], entity: 'rol', field: 'documentacion_baja', type: 'string' },
  { headers: ['ANTIGÜEDAD'], entity: 'persona', field: 'antiguedad', type: 'date' },
  { headers: ['ESTADO'], entity: 'rol', field: 'estado', type: 'string' },
];

// Columnas del archivo sin campo equivalente hoy en la BD — decisión explícita
// de no mapearlas en esta versión (ver plan). Se listan para mostrarlas en el
// resumen de preview, no porque haya que hacer algo con ellas.
const IGNORED_HEADERS = [
  'REGIMEN',
  'DOCUEMNTACION POU',
  'SR_DOC_RESPALD',
  'SR_COMENTARIO',
  'CR_COMENTARIO',
  'COD_FAMILIA',
  'LIT_FAMILIA',
  'COD SITUACION',
  'PROVINCIA',
  'PRIORITARIAS',
];

// La clave natural de fila: 1 persona = 1 cargo = 1 rol por período (verificado).
const NATURAL_KEY_HEADER = 'CUIL';

module.exports = { COLUMN_MAPPING, IGNORED_HEADERS, NATURAL_KEY_HEADER };
