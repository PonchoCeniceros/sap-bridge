// Export individual por módulo
export * from './types.js';
export * from './utils.js';
export * from './guards.js';
export { SapConn } from './config.js';
export { SapApi } from './api.js';
export { SessionHandler } from './session.js';

// Export específico para tipos (mejor control)
export type {
  ApiResponse,
  SapSession,
  HanaParams,
  SapErrorResponse,
  CollectionResponse,
  SingleResponse,
  SpecialResponse,
  ServiceLayerEndpoint,
  HanaEndpoint,
  SapAPI,
  SapSessionHandler,
  SapCredentials
} from './types.js';

// Export opciones de configuración
export type { SessionHandlerOptions } from './types.js';

// Export por defecto para facilitar uso
import { SapConn } from './config.js';
import { SapApi } from './api.js';
import { SessionHandler } from './session.js';

export default {
  SapConn,
  SapApi,
  SessionHandler
};
