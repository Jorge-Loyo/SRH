// Paleta de color por tipo de unidad organizativa, compartida entre las
// vistas Árbol (OrganigramaDetallePage) y Diagrama (OrganigramaFlowView).
// Cada tipo usa una familia de color de Tailwind distinta (no tonos de la
// misma familia) para que sean reconocibles entre sí de un vistazo.
export const TIPO_COLOR = {
  Ministerio:            'bg-slate-700 text-white',
  AREA:                  'bg-orange-600 text-white',
  'SSEC/DIREJE':         'bg-lime-700 text-white',
  GO:                    'bg-primary-700 text-white',
  SGO:                   'bg-blue-600 text-white',
  DG:                    'bg-fuchsia-600 text-white',
  'F/N DG':              'bg-violet-600 text-white',
  'F/N DEJE':            'bg-teal-600 text-white',
  'F/N MSTR - GO':       'bg-emerald-600 text-white',
  DHOS:                  'bg-rose-600 text-white',
  SDHOS:                 'bg-cyan-600 text-white',
  'UAI DG':              'bg-red-700 text-white',
  'UAI MSTR':            'bg-red-800 text-white',
  'PLTA TRANS. DOCENTE': 'bg-orange-500 text-white',
  REGIMEN:               'bg-amber-500 text-white',
  DEPT:                  'bg-indigo-600 text-white',
  'DEPT CA':             'bg-yellow-700 text-white',
  DIV:                   'bg-purple-600 text-white',
  'DIV CA':              'bg-green-600 text-white',
  UNID:                  'bg-pink-600 text-white',
  SECCION:               'bg-sky-600 text-white',
  SECC:                  'bg-sky-600 text-white',
  'SECCION CA':          'bg-stone-600 text-white',
};

export function tipoColor(tipo) {
  return TIPO_COLOR[tipo] || 'bg-gray-200 text-gray-700';
}

// El nombre largo del nodo (desc_rep) suele repetir como prefijo la misma
// sigla estructural que ya muestra el badge de tipo (ej: "DIV Legales",
// "SGO Recursos Humanos..."). Se quita acá para no duplicar esa info en la
// oración principal. No siempre coincide literal con el badge (ej: badge
// "SECCION CA" pero el nombre arranca con "SECC"), por eso se usa una lista
// de prefijos conocidos en lugar de derivarlo del título del propio nodo.
const REDUNDANT_NAME_PREFIXES = [
  'SECCION', 'SECC', 'DEPT', 'DIV', 'UNID', 'REGIMEN', 'SGO', 'GO', 'DG', 'AREA', 'DHOS', 'SDHOS',
];

export function stripRedundantPrefix(name) {
  if (!name) return name;
  const prefix = REDUNDANT_NAME_PREFIXES.find(p => name.startsWith(`${p} `));
  return prefix ? name.slice(prefix.length + 1) : name;
}

// Quita acentos/diacríticos y pasa a minúsculas, para comparar texto sin
// que mayúsculas ni tildes afecten la coincidencia (ej: "medico" encuentra
// "Médico" y viceversa).
function normalizeText(str) {
  return String(str)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Busca en todo el árbol (nombre, persona, cargo, código, tipo) y devuelve
// cada coincidencia con el camino de ids de sus ancestros — necesario para
// poder expandir el árbol/diagrama hasta llegar a cada resultado.
export function searchOrgTree(root, query) {
  const q = normalizeText(query.trim());
  if (!q || !root) return [];

  const results = [];
  function visit(node, path) {
    const haystack = normalizeText(
      [node.name, node.title, node.id, node.persona?.nombre, node.persona?.cargo]
        .filter(Boolean)
        .join(' ')
    );
    if (haystack.includes(q)) {
      results.push({ id: node.id, path });
    }
    (node.children || []).forEach(child => visit(child, [...path, node.id]));
  }
  visit(root, []);
  return results;
}
