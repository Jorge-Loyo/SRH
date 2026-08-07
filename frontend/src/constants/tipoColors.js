// Paleta de colores por tipo — fuente única de verdad
// Usada en Organigrama, Dotación, Concursales
export const TIPO_COLOR = {
  MEDICO:       { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'   },
  ENFERMERIA:   { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200'  },
  ADMINISTRATIVO:{ bg: 'bg-amber-100', text: 'text-amber-800',  border: 'border-amber-200'  },
  TECNICO:      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  SERVICIO:     { bg: 'bg-gray-100',   text: 'text-gray-800',   border: 'border-gray-200'   },
  DEFAULT:      { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200'   },
}

export function getTipoColor(tipo) {
  if (!tipo) return TIPO_COLOR.DEFAULT
  const key = tipo.toUpperCase().replace(/\s+/g, '_')
  return TIPO_COLOR[key] ?? TIPO_COLOR.DEFAULT
}
