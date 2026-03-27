/**
 * datos-comunes/hospitals-data.js
 * 
 * Centraliza datos de hospitales (IDs, nombres, categorías)
 * Usado en: vista_organigrama, vista_recorrida, vista_hospitales, vista_director
 * 
 * Si en futuro se trae de BD, se modifica SOLO aquí
 * (todos los componentes automáticamente actualizados)
 */

export const hospitals = [
  { id: 'HGARM', name: 'Hospital Ramos Mejia', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGAPP', name: 'Hospital Piñero', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HBR', name: 'Hospital Rivadavia', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGACD', name: 'Hospital Durand', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGAP', name: 'Hospital Penna', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGADS', name: 'Hospital Santojanni', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGACA', name: 'Hospital Argerich', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGATA', name: 'Hospital Alvarez', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGAJAF', name: 'Hospital Fernandez', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGAIP', name: 'Hospital Pirovano', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGNPE', name: 'Hospital Elizalde', category: 'HOSPITALES DE NIÑOS' },
  { id: 'HGNRG', name: 'Hospital Gutierrez', category: 'HOSPITALES DE NIÑOS' },
  { id: 'HIFJM', name: 'Hospital Muñiz', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HGAVS', name: 'Hospital Velez Sarsfield', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGAT', name: 'Hospital Tornu', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGAZ', name: 'Hospital Zubizarreta', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HGACG', name: 'Hospital Grierson', category: 'HOSPITALES DE AGUDOS' },
  { id: 'HNJTB', name: 'Hospital Borda', category: 'HOSPITALES DE SALUD MENTAL' },
  { id: 'HNBM', name: 'Hospital Moyano', category: 'HOSPITALES DE SALUD MENTAL' },
  { id: 'HMOMC', name: 'Hospital Marie Curie', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HMIRS', name: 'Hospital Sarda', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HBU', name: 'Hospital Udaondo', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HQ', name: 'Hospital Illia', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HIJCTG', name: 'Hospital Tobar Garcia', category: 'HOSPITALES DE SALUD MENTAL' },
  { id: 'HEPTA', name: 'Hospital Alvear', category: 'HOSPITALES DE SALUD MENTAL' },
  { id: 'HRRMF', name: 'Hospital Ferrer', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HSL', name: 'Hospital Santa Lucia', category: 'HOSPITALES MONOVALENTES' },
  { id: 'IZLP', name: 'Instituto Pasteur', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HMO', name: 'Hospital Dueñas', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HRR', name: 'Hospital Rocca', category: 'HOSPITALES MONOVALENTES' },
  { id: 'IRPS', name: 'Instituto R. Psicofisica', category: 'HOSPITALES MONOVALENTES' },
  { id: 'IREP', name: 'Instituto R. Psicofisica', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HOI', name: 'Hospital Quinquela Martin', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HOPL', name: 'Hospital Lagleyze', category: 'HOSPITALES MONOVALENTES' },
  { id: 'HO', name: 'Hospital Carrillo', category: 'HOSPITALES MONOVALENTES' },
];

/**
 * Mapeo rápido de ID a nombre para búsquedas O(1)
 * Evita iterar el array cada vez que necesitas nombre de hospital
 */
export const hospitalsMap = hospitals.reduce((acc, h) => {
  acc[h.id] = h.name;
  return acc;
}, {});

/**
 * Agrupador por categoría (útil para listas organizadas)
 */
export const hospitalsByCategory = hospitals.reduce((acc, h) => {
  if (!acc[h.category]) {
    acc[h.category] = [];
  }
  acc[h.category].push(h);
  return acc;
}, {});
