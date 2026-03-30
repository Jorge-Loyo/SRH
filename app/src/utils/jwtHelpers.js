const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { AppDataSource } = require('../config/data-source');
const { User } = require('../entities-class/User');
const { permissionCache } = require('./permissionCache');

/**
 * Generates a JWT access token for a user
 * 
 * @param {Object} user - User object with email, username, role
 * @param {string} expiresIn - Token expiration (e.g., '15m', '1h'). Defaults to AUTH_IDLE_MINUTES from config
 * @param {string} jti - JWT ID (unique identifier for this token)
 * @returns {string} Signed JWT token
 */
function generateJWT(user, expiresIn = null, jti = null) {
  // Use config.auth.idleMinutes if expiresIn not provided
  if (!expiresIn) {
    expiresIn = `${config.auth.idleMinutes}m`;
  }
  const payload = {
    sub: user.username || user.email,
    email: user.email,
    role: user.role,
    username: user.username,
    hospital_code: user.hospital_code || null
  };
  
  // Include jti if provided (for token revocation tracking)
  if (jti) {
    payload.jti = jti;
  }
  
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn });
}

/**
 * Validates JWT token and loads user from database
 * Extracted from authenticateJWT middleware for reusability
 * 
 * @param {string} token - JWT token to validate
 * @returns {Promise<Object|null>} User object with permissions if valid, null if invalid/expired
 * 
 * @example
 * const user = await validateJWTAndLoadUser(token);
 * if (user) {
 *   logger.info('User authenticated:', { username: user.username, role: user.role });
 * }
 */
async function validateJWTAndLoadUser(token) {
  if (!token) return null;
  
  try {
    // Verify JWT signature and expiration
    const payload = jwt.verify(token, config.auth.jwtSecret);
    
    // Load user and permissions from database (DB mode only)
    if (config.auth.mode === 'db') {
      const userRepo = AppDataSource.getRepository(User);
      
      // Load user from DB + permissions from cache (optimización N+1)
      const user = await userRepo.findOne({ where: [{ username: payload.sub }, { email: payload.sub }] });
      const permissions = await permissionCache.getPermissions(payload.role);
      
      // User not found or inactive
      if (!user || !user.is_active) return null;
      
      // Build user object with all required fields
      // NOTE: email field is set to username for AdminJS UI display (shows username instead of email)
      // ✅ [FIX ROOT CAUSE] NO include permissions object - AdminJS v6 will serialize it as [object Object]
      const userObj = {
        username: user.username,
        email: user.username,  // Show username in AdminJS UI, not email
        role: user.role,
        hospital_code: user.hospital_code || null,
        user_id: user.id,
        id: user.id  // Also include 'id' field for AdminJS compatibility
      };
      
      // ❌ DO NOT attach permissions to userObj - it's an object that will be serialized
      // Store permissions separately if needed for API access control (in next section)
      
      return userObj;
    }
    
    // Fallback for non-DB mode (env-based authentication)
    return {
      username: payload.sub,
      email: payload.sub,
      role: payload.role
    };
  } catch (err) {
    // JWT verification failed (invalid signature, expired, malformed, etc.)
    return null;
  }
}

module.exports = { generateJWT, validateJWTAndLoadUser };
