// Central export of all entity classes (TypeScript definitions loaded via ts-node)
// Keeps a single source of truth for entity arrays used across server, migrations, seeds.

const { Sigla } = require('./Sigla')
const { Persona } = require('./Persona')
const { Cargo } = require('./Cargo')
const { Rol } = require('./Rol')
const { BajaConcurso } = require('./BajaConcurso')
const { User } = require('./User')
const { RefreshToken } = require('./RefreshToken')
const { AuditLog } = require('./AuditLog')
const { Permission } = require('./Permission')
const { Recorrida } = require('./Recorrida')
const { Concurso } = require('./Concurso')
const { Minuta } = require('./Minuta')
const { Pou } = require('./Pou')

const entities = [Sigla, Persona, Cargo, Rol, BajaConcurso, User, RefreshToken, AuditLog, Permission, Recorrida, Concurso, Minuta, Pou]

module.exports = { Sigla, Persona, Cargo, Rol, BajaConcurso, User, RefreshToken, AuditLog, Permission, Recorrida, Concurso, Minuta, Pou, entities }

