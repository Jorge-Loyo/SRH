const { Persona } = require('../../entities-class/Persona');
const { Cargo } = require('../../entities-class/Cargo');
const { Rol } = require('../../entities-class/Rol');

const ENTITY_BY_KIND = { persona: { Entity: Persona, pk: 'id_persona' }, cargo: { Entity: Cargo, pk: 'id_cargo' }, rol: { Entity: Rol, pk: 'id_rol' } };

/**
 * Asigna IDs nuevos para filas "nuevas" del import.
 *
 * No hay auto_increment en estas columnas (los IDs se tipeaban a mano hasta
 * ahora) y el PK real es (id, periodo), así que no hace falta que el ID sea
 * estable entre períodos — sólo único dentro del período que se está
 * escribiendo. Para que los IDs no se solapen visualmente entre períodos al
 * mirar la BD cruda, se arrancan siempre desde el máximo global (todas las
 * columnas).
 *
 * IMPORTANTE: crear dentro de la misma transacción que hace el INSERT final,
 * para que el MAX() leído sea consistente con lo que se está por escribir.
 */
async function createIdAllocator(manager) {
  const next = {};
  for (const [kind, { Entity, pk }] of Object.entries(ENTITY_BY_KIND)) {
    const result = await manager
      .createQueryBuilder(Entity, 't')
      .select(`MAX(t.${pk})`, 'max')
      .getRawOne();
    next[kind] = Number(result?.max || 0) + 1;
  }

  return {
    allocate(kind) {
      const id = next[kind];
      next[kind] += 1;
      return id;
    },
  };
}

module.exports = { createIdAllocator };
