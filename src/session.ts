import { createClient } from "redis";
import { handleResponse } from "./utils.js";
import { SapCredentials, SapSessionHandler, SapSession, HanaParams, ApiResponse } from './types.js';

/**
 * Opciones de configuración para logs
 */
interface ColorOptions {
  RED?: string;
  GREEN?: string;
  BLUE?: string;
  CIAN?: string;
}

/**
 * Opciones para configurar el SessionHandler
 */
export interface SessionHandlerOptions {
  colors?: ColorOptions;
  debug?: boolean;
}

const defaultColors: ColorOptions = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  CIAN: '\x1b[36m'
};

/**
 *
 */
export function SessionHandler(credentials: SapCredentials, options?: SessionHandlerOptions): SapSessionHandler {
  const logColors = options?.colors || defaultColors;
  const isDebug = options?.debug ?? (process.env.SAP_DEBUG === 'true' || process.env.NODE_ENV === 'development');

  /**
   * Helper para logging condicional
   */
  const log = {
    cian: (message: string) => { if (isDebug) console.log(logColors.CIAN, message); },
    green: (message: string) => { if (isDebug) console.log(logColors.GREEN, message); },
    blue: (message: string) => { if (isDebug) console.log(logColors.BLUE, message); },
    red: (message: string) => { if (isDebug) console.log(logColors.RED, message); }
  };

  return {
    /**
     *
     */
    async login(): Promise<ApiResponse<void>> {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      try {
        const { CompanyDB, UserName, Password, ApiUrl } = credentials.serviceLayer;

        const prevSession = await this.getSession();
        if (prevSession) {
          log.cian(`[📁] sesion previa existente: ${prevSession.id}`);
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
      }
    },

    /**
     *
     */
    async getSession(): Promise<SapSession> {
      const { SessionStorage } = credentials.serviceLayer;
      const redisClient = createClient({ url: SessionStorage });
      redisClient.connect();
      const sessionString = await redisClient.get("b1_session");
      await redisClient.quit();
      const session = sessionString ? JSON.parse(sessionString) : null;
      return session;
    },

    /**
     *
     */
    async setSession(session: SapSession) {
      const { SessionStorage } = credentials.serviceLayer;
      const redisClient = createClient({ url: SessionStorage });
      redisClient.connect();
      await redisClient.set("b1_session", JSON.stringify(session));
      await redisClient.quit();
    },

    /**
     *
     */
    async cleanSession(): Promise<void> {
      const { SessionStorage } = credentials.serviceLayer;
      const redisClient = createClient({ url: SessionStorage });
      redisClient.connect();
      await redisClient.del("b1_session");
      await redisClient.quit();
    },

    /**
     *
     */
    onSession(endpoint) {
      return async (...args) => {
        const apiUrl = credentials.serviceLayer.ApiUrl || "";
        log.blue('[📁] primer intento de uso de la sesion...');
        const session = await this.getSession();
        const result = await endpoint(session, apiUrl, ...args);

        if (result?.expired) {
          log.red('[📁] la sesión falló, segundo intento...');
          await this.cleanSession();
          await this.login();
          const newSession = await this.getSession();
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
