import type { SapSessionHandler } from "../types";

// Decorador para Service Layer
export function OnSession(endpoint: any, _context: ClassMethodDecoratorContext) {
  return async function(this: any, ...args: any[]) {
    const hdl: SapSessionHandler = this.handler; // 'this' es tu clase de API

    let session = await hdl.getSession();
    if (!session) {
      const loginResult = await hdl.login();
      if (!loginResult.isOk) return loginResult;
      session = await hdl.getSession();
    }
    let result = await endpoint.call(this, session, hdl.apiUrl, ...args);
    if (result?.expired) {
      try {
        await hdl.cleanSession();
      } catch (error: unknown) {
        const mssg = error instanceof Error ? error.message : "Unknown error";
        return { isOk: false, mssg: `Failed to clean session: ${mssg}` };
      }
      const loginResult = await hdl.login();
      if (!loginResult.isOk) return loginResult;
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
    // Usamos la estructura anidada
    const params = hdl.hana.getParams();
    // Extraemos todos los argumentos excepto el primero (que es el null/placeholder)
    const [_, ...rest] = args;
    // Llamamos a la función inyectando 'params' y luego el resto de argumentos reales
    return await endpoint.call(this, params, ...rest);

  };
}
