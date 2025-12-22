import hdb from "@sap/hana-client";
import { handleResponse, isSessionExpired } from "./utils.js";
import { SapAPI, ApiResponse, SapSession, HanaParams, isCollection, isSingle, isSpecial, SingleResponse, SpecialResponse } from "./types.js";

/**
 *
 */
export function SapApi(): SapAPI {

  return {
    /**
     *
     */
    async get(session: SapSession, apiUrl: string, query: string, maxPageSize?: number): Promise<ApiResponse<unknown>> {
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
        const mssg = error instanceof Error ? error.message : "Unknown error";

        return {
          expired: isSessionExpired(mssg),
          isOk: false,
          mssg
        } as ApiResponse<void>;

      } finally {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
      }
    },

    hana: {
      /**
       *
       */
      async get(params: HanaParams, query: string): Promise<ApiResponse<unknown>> {
        const { createConnection } = hdb;
        const cnxn: hdb.Connection = createConnection();
        const connParams: hdb.ConnectionOptions = { ...params.credentials };

        await new Promise<void>((resolve, reject) => {
          cnxn.connect(connParams, (err: Error) => {
            if (err) return reject(`Hana error connection: ${err}`);
            resolve();
          });
        });

        const resl: ApiResponse<unknown> = await new Promise((resolve, _reject) => {
          cnxn.exec(query, (err: any, resl: any) => {
            const resp = (err) ? {
              isOk: false,
              mssg: `${err}`,
            } : {
              isOk: true,
              mssg: `successfull`,
              data: resl
            } as ApiResponse<unknown>;
            resolve(resp);
          });
        });

        cnxn.disconnect();
        return resl;
      }
    }
  }
}