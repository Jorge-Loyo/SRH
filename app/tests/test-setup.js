/**
 * Setup inicial para Jest - Polyfills y configuración global
 */

// TextEncoder/TextDecoder polyfill para Node.js
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
