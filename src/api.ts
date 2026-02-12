import hdb from "@sap/hana-client";
import { OnSession, OnHana } from "./decorators/index.js";
import { handleResponse, isSessionExpired } from "./utils.js";
import { isCollection, isSingle, isSpecial } from "./guards.js";
import type { SapSessionHandler, ApiResponse, SingleResponse, SpecialResponse } from "./types.js";


export class SapApi {
  public company: string;

  constructor(public handler: SapSessionHandler) {
    this.company = handler.hana.getCompany();
  }

  @OnSession
  async get(session: any, apiUrl: any, query: string, maxPageSize?: number) {
    if (!session) {
      throw new Error('Session is required for API calls');
    }

    process.env.NODE_NO_WARNINGS = '1';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      const resl = await fetch(`${apiUrl}/${query}`, {
        method: 'GET',
        headers: {
          'Cookie': `B1SESSION=${session.id}; ROUTEID=${session.node}`,
          'Prefer': `odata.maxpagesize=${maxPageSize ? maxPageSize : 1}`
        }
      });
      const resp = await handleResponse(resl);

      if (resp === null) {
        return {
          isOk: true,
          mssg: 'successfull query (HTTP 204)'
        } as ApiResponse<unknown>;
      }
      else if (isCollection<unknown>(resp)) {
        return {
          isOk: true,
          data: resp.value,
          mssg: 'collection object successfully quered'
        } as ApiResponse<unknown>;
      }
      else if (isSingle<unknown>(resp)) {
        return {
          isOk: true,
          data: resp,
          mssg: 'single object successfully quered'
        } as ApiResponse<SingleResponse<any>>;
      }
      else if (isSpecial(resp)) {
        return {
          isOk: true,
          data: resp,
          mssg: 'special object successfully quered'
        } as ApiResponse<SpecialResponse>;
      }
      else {
        return {
          isOk: true,
          data: resp,
          mssg: 'successfull query'
        } as ApiResponse<unknown>;

      }

    } catch (error: unknown) {
      const baseMssg = error instanceof Error ? error.message : "Unknown error";
      const mssg = `Failed to GET ${apiUrl}/${query}: ${baseMssg}`;

      return {
        expired: isSessionExpired(mssg),
        isOk: false,
        mssg
      } as ApiResponse<void>;

    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      process.env.NODE_NO_WARNINGS = '0';
    }
  }

  @OnSession
  async post(session: any, apiUrl: any, query: string, body: unknown) {
    if (!session) {
      throw new Error('Session is required for API calls');
    }

    process.env.NODE_NO_WARNINGS = '1';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      const resl = await fetch(`${apiUrl}/${query}`, {
        method: 'POST',
        headers: {
          'Cookie': `B1SESSION=${session.id}; ROUTEID=${session.node}`,
        },
        body: JSON.stringify(body)
      });
      const resp = await handleResponse(resl);

      if (resp === null) {
        return {
          isOk: true,
          mssg: 'successfull query (HTTP 204)'
        } as ApiResponse<unknown>;
      }
      else if (isCollection<unknown>(resp)) {
        return {
          isOk: true,
          data: resp.value,
          mssg: 'collection object successfully quered'
        } as ApiResponse<unknown>;
      }
      else if (isSingle<unknown>(resp)) {
        return {
          isOk: true,
          data: resp,
          mssg: 'single object successfully quered'
        } as ApiResponse<SingleResponse<any>>;
      }
      else if (isSpecial(resp)) {
        return {
          isOk: true,
          data: resp,
          mssg: 'special object successfully quered'
        } as ApiResponse<SpecialResponse>;
      }
      else {
        return {
          isOk: true,
          data: resp,
          mssg: 'successfull query'
        } as ApiResponse<unknown>;

      }

    } catch (error: unknown) {
      const baseMssg = error instanceof Error ? error.message : "Unknown error";
      const mssg = `Failed to POST ${apiUrl}/${query}: ${baseMssg}`;

      return {
        expired: isSessionExpired(mssg),
        isOk: false,
        mssg
      } as ApiResponse<void>;

    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      process.env.NODE_NO_WARNINGS = '0';
    }
  }

  @OnSession
  async patch(session: any, apiUrl: any, query: string, body: unknown, replace?: boolean) {
    if (!session) {
      throw new Error('Session is required for API calls');
    }

    process.env.NODE_NO_WARNINGS = '1';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      const resl = await fetch(`${apiUrl}/${query}`, {
        method: 'PATCH',
        headers: {
          'Cookie': `B1SESSION=${session.id}; ROUTEID=${session.node}`,
          'B1S-ReplaceCollectionsOnPatch': replace ? 'true' : 'false'
        },
        body: JSON.stringify(body)
      });
      const resp = await handleResponse(resl);

      if (resp === null) {
        return {
          isOk: true,
          mssg: 'successfull query (HTTP 204)'
        } as ApiResponse<unknown>;
      }
      else if (isCollection<unknown>(resp)) {
        return {
          isOk: true,
          data: resp.value,
          mssg: 'collection object successfully quered'
        } as ApiResponse<unknown>;
      }
      else if (isSingle<unknown>(resp)) {
        return {
          isOk: true,
          data: resp,
          mssg: 'single object successfully quered'
        } as ApiResponse<SingleResponse<any>>;
      }
      else if (isSpecial(resp)) {
        return {
          isOk: true,
          data: resp,
          mssg: 'special object successfully quered'
        } as ApiResponse<SpecialResponse>;
      }
      else {
        return {
          isOk: true,
          data: resp,
          mssg: 'successfull query'
        } as ApiResponse<unknown>;

      }

    } catch (error: unknown) {
      const baseMssg = error instanceof Error ? error.message : "Unknown error";
      const mssg = `Failed to PATCH ${apiUrl}/${query}: ${baseMssg}`;

      return {
        expired: isSessionExpired(mssg),
        isOk: false,
        mssg
      } as ApiResponse<void>;

    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      process.env.NODE_NO_WARNINGS = '0';
    }
  }

  @OnHana
  private async _hanaQuery(params: any, query: string) {
    const { createConnection } = hdb;
    let cnxn: hdb.Connection | undefined;

    try {
      if (!params?.credentials) {
        throw new Error("HANA credentials are missing in params.");
      }
      const connParams: hdb.ConnectionOptions = { ...params.credentials };
      cnxn = createConnection();

      // promise para la conexion con la base de datos
      await new Promise<void>((resolve, reject) => {
        cnxn!.connect(connParams, (err: Error) => {
          if (err) return reject(new Error(`Hana error connection: ${err}`));
          resolve();
        });
      });

      // promise para la ejecucion de la consulta
      const resl = await new Promise<any>((resolve, reject) => {
        cnxn!.exec(query, (err: any, rows: any) => {
          if (err) {
            // Incluimos la query en el error para que el debug sea instantáneo
            return reject(new Error(`HANA Exec Error: ${err.message} | Query: ${query}`));
          }
          resolve(rows);
        });
      });

      // Éxito: Retornamos el objeto ApiResponse
      return {
        isOk: true,
        mssg: `Query successful`,
        data: resl
      };
    } catch (error) {
      const baseMssg = error instanceof Error ? error.message : String(error);
      throw new Error(baseMssg);

    } finally {
      if (cnxn) {
        try {
          cnxn.disconnect();
        } catch (err) {
          // Logueamos el error de desconexión pero no lo lanzamos 
          // para no ocultar el error principal de la query.
          console.error("Error al intentar disconnect en Hana:", err);
        }
      }
    }
  }

  // Estructura HANA compatible con la interfaz
  get hana() {
    return {
      query: (str: string) => this._hanaQuery(null as any, str)
    };
  }
}
