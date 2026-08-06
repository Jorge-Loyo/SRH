// Central export of all entity classes (TypeScript definitions loaded via ts-node)
// Keeps a single source of truth for entity arrays used across server, migrations, seeds.

const { Sigla } = require('./Sigla')
const { Persona } = require('./Persona')
const { Cargo } = require('./Cargo')
const { Rol } = require('./Rol')
const { User } = require('./User')
const { RefreshToken } = require('./RefreshToken')
const { AuditLog } = require('./AuditLog')
const { Permission } = require('./Permission')
const { Recorrida } = require('./Recorrida')
const { Minuta } = require('./Minuta')
const { Pou } = require('./Pou')

// ─── Módulo 2 ──────────────────────────────────────────────────────────────────
const { BajaConsolidada }    = require('../modules/bajas/BajaConsolidadaEntity')
const { SeguimientoCph }     = require('../modules/seguimiento-cph/SeguimientoCphEntity')
const { ConjuntosConfig }    = require('../modules/conjuntos-config/ConjuntosConfigEntity')
const { SeguimientoCeetps }  = require('../modules/seguimiento-ceetps/SeguimientoCeetpsEntity')

// ─── Módulo Alta de Cargo ──────────────────────────────────────────────────────
const { CargosAlta }     = require('../modules/alta-cargo/AltaCargoEntity')
const { RegistroCph, RegistroEnf, RegistroTecPou, RegistroTecPof } = require('../modules/alta-cargo/AltaCargoSubEntities')

const entities = [Sigla, Persona, Cargo, Rol, User, RefreshToken, AuditLog, Permission, Recorrida, Minuta, Pou, BajaConsolidada, SeguimientoCph, ConjuntosConfig, SeguimientoCeetps, CargosAlta, RegistroCph, RegistroEnf, RegistroTecPou, RegistroTecPof]

module.exports = { Sigla, Persona, Cargo, Rol, User, RefreshToken, AuditLog, Permission, Recorrida, Minuta, Pou, BajaConsolidada, SeguimientoCph, ConjuntosConfig, SeguimientoCeetps, CargosAlta, RegistroCph, RegistroEnf, RegistroTecPou, RegistroTecPof, entities }

