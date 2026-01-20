/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Respuseta generica para toda la aplicacion
 */
export interface ApiResponse<T> {
  isOk: boolean;
  mssg: string;
  data?: T;
  expired?: boolean;
}

/**
 * Opciones para configurar el SessionHandler
 */
export interface SessionHandlerOptions {
  debug?: boolean;
  storageType?: 'redis' | 'json';  // Tipo de almacenamiento para sesiones
  jsonFilePath?: string;           // Ruta del archivo JSON (solo para storageType: 'json')
  redisUrl?: string;               // URL de Redis (opcional, sobrescribe SessionStorage)
}

/**
 * Interfaz para adaptadores de almacenamiento de sesiones
 */
export interface SessionStorageAdapter {
  getSession(): Promise<SapSession | null>;
  setSession(session: SapSession): Promise<void>;
  cleanSession(): Promise<void>;
}

/**
 * sesión
 */
export interface SapSession {
  id: string;
  node: string;
  timeout: number;
}

/**
 * parametros de conexion para Hana
 */
export interface HanaParams {
  credentials: {
    serverNode: string;
    UID: string;
    PWD: string;
    sslValidateCertificate: string;
  },
  database: string;
}

/**
 *
 */
export interface SapErrorResponse {
  error?: {
    message?: { value?: string };
  };
}


/**
 * Colección
 */
export interface CollectionResponse<T> {
  "odata.metadata": string;
  value: T[];
}

/**
 * Único elemento (formato raw SAP)
 */
export type SingleResponse<T> = {
  "odata.metadata": string;
} & T;

/**
 * Respuestas especiales (Login, Logout, errores, etc.)
 */
export interface SpecialResponse {
  [key: string]: any;
}

/**
 *
 */
export interface SapAPI {
  company: string;
  get(query: string, maxPageSize?: number): Promise<ApiResponse<unknown>>;
  post(query: string, body: unknown): Promise<ApiResponse<unknown>>;
  patch(query: string, body: unknown, replace?: boolean): Promise<ApiResponse<unknown>>;

  hana: {
    query(str: string): Promise<ApiResponse<unknown>>;
  }
}


/**
 *
 */
export interface SapSessionHandler {
  apiUrl: string;
  login(): Promise<ApiResponse<void>>;
  getSession(): Promise<SapSession | null>;
  setSession(session: SapSession): Promise<void>;
  cleanSession(): Promise<void>;

  hana: {
    getParams(): HanaParams;
    getCompany(): string;
  }
}




/**
 * Objeto que engloba los tipos de conexion existentes
 * para la infraestructura de SAP
 */
export interface SapCredentials {
  serviceLayer: {
    ApiUrl: string | undefined;
    CompanyDB: string | undefined;
    UserName: string | undefined;
    Password: string | undefined;
    SessionStorage: string | undefined;
  },
  hanaDatabase: {
    serverNode: string | undefined;
    UID: string | undefined;
    PWD: string | undefined;
    database: string | undefined;
    sslValidateCertificate: string | undefined;
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
