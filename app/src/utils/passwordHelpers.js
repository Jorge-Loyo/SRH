const bcrypt = require('bcryptjs');

/**
 * Utilidades centralizadas para manejo de passwords con bcrypt
 * 
 * Si en el futuro se desea cambiar a otra librería (Argon2, scrypt),
 * se modifica solo aquí en lugar de 4 archivos diferentes.
 */

const SALT_ROUNDS = 10;

/**
 * Hashea un password en plain text
 * @param {string} plainPassword - Password sin encriptar
 * @returns {string} Password hasheado y salted
 */
function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password debe ser un string no vacío');
  }
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
}

/**
 * Compara un password en plain text con su hash
 * @param {string} plainPassword - Password sin encriptar
 * @param {string} hash - Hash almacenado en la BD
 * @returns {boolean} true si coinciden, false si no
 */
function comparePassword(plainPassword, hash) {
  if (!plainPassword || !hash || typeof plainPassword !== 'string' || typeof hash !== 'string') {
    return false;
  }
  return bcrypt.compareSync(plainPassword, hash);
}

module.exports = { hashPassword, comparePassword };
