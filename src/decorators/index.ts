import type { SapSessionHandler } from "../types";

// Decorador para Service Layer
export function OnSession(endpoint: any, _context: ClassMethodDecoratorContext) {
  return async function(this: any, ...args: any[]) {
    const hdl: SapSessionHandler = this.handler; // 'this' es tu clase de API

    let session = await hdl.getSession();
    if (!session) {
      await hdl.login();
      session = await hdl.getSession();
    }

    // Inyectamos session y apiUrl
    let result = await endpoint.call(this, session, hdl.apiUrl, ...args);

    // Lógica de reintento si expira
    if (result?.expired) {
      await hdl.cleanSession();
      await hdl.login();
      const newSession = await hdl.getSession();
      result = await endpoint.call(this, newSession, hdl.apiUrl, ...args);
    }
    return result;
  };
}

// Decorador para HANA
export function OnHana(endpoint: any, _context: ClassMethodDecoratorContext) {
  return async function(this: any, ...args: any[]) {
    const hdl: SapSessionHandler = this.handler;
    const params = hdl.hana.getParams(); // Usamos la estructura anidada
    return await endpoint.call(this, params, ...args);
  };
}
