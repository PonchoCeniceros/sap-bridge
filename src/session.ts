import { handleResponse } from "./utils.js";
import { RedisSessionAdapter, JsonFileSessionAdapter } from "./storage/index.js";
import type {
  SapCredentials,
  SapSessionHandler,
  SapSession,
  HanaParams,
  ApiResponse,
  SessionStorageAdapter,
  SessionHandlerOptions
} from './types.js';

/**
 *
 */
export function SessionHandler(credentials: SapCredentials, options?: SessionHandlerOptions): SapSessionHandler {
  const isDebug = options?.debug ?? (process.env.SAP_DEBUG === 'true' || process.env.NODE_ENV === 'development');
  const storageType = options?.storageType ?? 'redis';
  const jsonFilePath = options?.jsonFilePath ?? './sap-session.json';
  const redisUrl = options?.redisUrl ?? credentials.serviceLayer.SessionStorage;

  /**
   * Helper para logging condicional
   */
  const log = {
    cyan: (message: string) => { if (isDebug) console.log(`\x1b[36m${message}`); },
    green: (message: string) => { if (isDebug) console.log(`\x1b[32m${message}`); },
    blue: (message: string) => { if (isDebug) console.log(`\x1b[34m${message}`); },
    red: (message: string) => { if (isDebug) console.log(`\x1b[31m${message}`); }
  };

  /**
   * Adaptador de almacenamiento seleccionado
   */
  const storageAdapter: SessionStorageAdapter = storageType === 'json'
    ? new JsonFileSessionAdapter(jsonFilePath, isDebug)
    : new RedisSessionAdapter(redisUrl || '', isDebug);

  return {
    /**
     *
     */
    async login(): Promise<ApiResponse<void>> {
      process.env.NODE_NO_WARNINGS = '1';
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      try {
        const { CompanyDB, UserName, Password, ApiUrl } = credentials.serviceLayer;

        const prevSession: SapSession | null = await this.getSession();
        if (prevSession) {
          log.cyan(`[📁] sesion previa existente: ${prevSession.id}`);
          return {
            isOk: true,
            mssg: 'Login successful.'
          };
        }

        const resl = await fetch(`${ApiUrl}/Login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ CompanyDB, UserName, Password }),
        });
        const resp = await handleResponse(resl);

        const cookies = resl.headers.get('set-cookie');
        if (!cookies || !cookies.includes('B1SESSION')) {
          throw new Error('Login failed: B1SESSION cookie not found in response.');
        }
        const routeMatch = cookies.match(/ROUTEID=([^;,\s]+)/);
        if (!routeMatch || !routeMatch[1]) {
          throw new Error('Login failed: ROUTEID not found in response cookie.');
        }

        const session = {
          id: resp.SessionId,
          node: routeMatch[1],
          timeout: Date.now() + (resp.SessionTimeout * 60 * 1000),
        };
        log.green(`[📁] nueva sesion cargada: ${session.id}`);
        await this.setSession(session);

        return {
          isOk: true,
          mssg: 'Login successful.'
        };

      } catch (error: unknown) {
        const mssg = error instanceof Error ? error.message : "Unknown error";

        return {
          isOk: false,
          mssg,
        };

      } finally {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
        process.env.NODE_NO_WARNINGS = '0';
      }
    },

    /**
     *
     */
    async getSession(): Promise<SapSession | null> {
      return await storageAdapter.getSession();
    },

    /**
     *
     */
    async setSession(session: SapSession): Promise<void> {
      await storageAdapter.setSession(session);
    },

    /**
     *
     */
    async cleanSession(): Promise<void> {
      await storageAdapter.cleanSession();
    },

    /**
     *
     */
    onSession(endpoint) {
      return async (...args) => {
        const apiUrl = credentials.serviceLayer.ApiUrl || "";
        log.blue('[📁] primer intento de uso de la sesion...');
        let session = await this.getSession();

        // Si no hay sesión almacenada, hacer login primero
        if (!session) {
          log.cyan('[📁] no hay sesión almacenada, haciendo login...');
          await this.login();
          session = await this.getSession();
        }

        if (!session) {
          throw new Error('Failed to obtain session after login');
        }

        const result = await endpoint(session, apiUrl, ...args);

        if (result?.expired) {
          log.red('[📁] la sesión falló, segundo intento...');
          await this.cleanSession();
          await this.login();
          const newSession = await this.getSession();
          if (!newSession) {
            throw new Error('Failed to obtain session after re-login');
          }
          const newResult = await endpoint(newSession, apiUrl, ...args);
          return newResult;
        }

        return result;
      };
    },

    hana: {
      /**
       *
       */
      getParams(): HanaParams {
        const params = {
          credentials: {
            serverNode: credentials.hanaDatabase.serverNode,
            UID: credentials.hanaDatabase.UID,
            PWD: credentials.hanaDatabase.PWD,
            sslValidateCertificate: credentials.hanaDatabase.sslValidateCertificate,
          },
          database: credentials.hanaDatabase.database,
        } as HanaParams;

        return params;
      },

      /**
       *
       */
      getCompany(): string {
        return credentials.hanaDatabase.database || "";
      },

      /**
       *
       */
      onSession(endpoint) {
        return async (...args) => {
          log.blue('[📁] inyeccion de los parametros de conexion a la db...');
          const params = this.getParams();
          const result = await endpoint(params, ...args);
          return result;
        };
      },
    }


  }
}
