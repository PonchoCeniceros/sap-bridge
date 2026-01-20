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


export class SessionHandler implements SapSessionHandler {
  private isDebug: boolean;
  private storageAdapter: SessionStorageAdapter;

  constructor(private credentials: SapCredentials, options?: SessionHandlerOptions) {
    this.isDebug = options?.debug ?? false;
    this.storageAdapter = options?.storageType === 'json'
      ? new JsonFileSessionAdapter(options?.jsonFilePath ?? './sap.json', this.isDebug)
      : new RedisSessionAdapter(credentials.serviceLayer.SessionStorage || '', this.isDebug);
  }

  // Getter para cumplir con la interfaz
  get apiUrl() { return this.credentials.serviceLayer.ApiUrl || ""; }

  async getSession() { return await this.storageAdapter.getSession(); }
  async setSession(s: SapSession) { await this.storageAdapter.setSession(s); }
  async cleanSession() { await this.storageAdapter.cleanSession(); }

  // Objeto hana cumpliendo la interfaz
  hana = {
    getParams: () => ({
      credentials: this.credentials.hanaDatabase,
      database: this.credentials.hanaDatabase.database
    } as HanaParams),
    getCompany: () => this.credentials.hanaDatabase.database || ""
  };


  async login(): Promise<ApiResponse<void>> {

    process.env.NODE_NO_WARNINGS = '1';
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      const { CompanyDB, UserName, Password, ApiUrl } = this.credentials.serviceLayer;

      const prevSession: SapSession | null = await this.getSession();
      if (prevSession) {
        // console.log(`[📁] sesion previa existente: ${prevSession.id}`);
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
      // console.log(`[📁] nueva sesion cargada: ${session.id}`);
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
  }
}
