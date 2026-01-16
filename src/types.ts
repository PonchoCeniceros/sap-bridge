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
 * Colección SAP
 */
export function isCollection<T>(res: any): res is CollectionResponse<T> {
  return (
    res &&
    typeof res === "object" &&
    Array.isArray(res.value)
  );
}

/**
 * Entidad única SAP
 */
export function isSingle<T>(res: any): res is SingleResponse<T> {
  return (
    res &&
    typeof res === "object" &&
    !Array.isArray(res.value) &&                // no debe ser array
    typeof res["odata.metadata"] === "string"  // debe tener metadata SAP
  );
}

/**
 * Respuesta especial SAP
 */
export function isSpecial(res: any): res is SpecialResponse {
  return (
    res &&
    typeof res === "object" &&
    res["odata.metadata"] === undefined        // no hay metadata
  );
}

/**
 *
 */
export type ServiceLayerEndpoint<T extends unknown[], R> = (
  session: SapSession,
  apiUrl: string,
  ...args: T
) => Promise<ApiResponse<R>>;

/**
 *
 */
export type HanaEndpoint<T extends unknown[], R> = (
  params: HanaParams,
  ...args: T
) => Promise<ApiResponse<R>>;

/**
 *
 */
export interface SapAPI {
  get(session: SapSession, apiUrl: string, query: string, maxPageSize?: number): Promise<ApiResponse<unknown>>;
  post(session: SapSession, apiUrl: string, query: string, body: unknown): Promise<ApiResponse<unknown>>;
  patch(session: SapSession, apiUrl: string, query: string, body: unknown, replace?: boolean): Promise<ApiResponse<unknown>>;
  hana: {
    get(params: HanaParams, query: string): Promise<ApiResponse<unknown>>;
  }
}

/**
 *
 */
export interface SapSessionHandler {
  login: () => Promise<ApiResponse<void>>;
  getSession: () => Promise<SapSession>;
  setSession: (session: SapSession) => Promise<void>;
  cleanSession: () => Promise<void>;
  onSession: <T extends unknown[], R>(endpoint: ServiceLayerEndpoint<T, R>) => (...args: T) => Promise<ApiResponse<R>>;
  hana: {
    onSession: <T extends unknown[], R>(endpoint: HanaEndpoint<T, R>) => (...args: T) => Promise<ApiResponse<R>>;
    getParams: () => HanaParams;
    getCompany: () => string;
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
