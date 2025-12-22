// Example based on real application usage
import { SapConn, SapApi, SessionHandler } from '@ponchoceniceros/sap';
import type { SapCredentials, SapAPI, SapSessionHandler, SessionHandlerOptions } from '@ponchoceniceros/sap';

/**
 * Provider Pattern - Centralized SAP Configuration
 * Based on src/orders/providers.ts
 */
function SapProvider(debug?: boolean) {
  const credentials: SapCredentials = SapConn();
  const options: SessionHandlerOptions = { debug: debug ?? false };
  const hdl: SapSessionHandler = SessionHandler(credentials, options);
  const api: SapAPI = SapApi();

  return { hdl, api };
}

/**
 * Service Layer Query - Based on src/application/orders.ts
 */
async function getOrdersBySl(hdl: SapSessionHandler, api: SapAPI) {
  // Single document query
  const query = `Orders(2832)`;

  // List query with filters
  // const query = `Orders?$filter=DocNum eq 986&$select=DocNum,DocEntry,DocumentLines`;

  // Simple list query
  // const query = `Orders?$select=DocNum,DocEntry`;

  const resp = await hdl.onSession(api.get)(query, 10);
  return resp;
}

/**
 * HANA Database Query - Based on src/application/orders.ts
 */
async function getOrdersByHana(hdl: SapSessionHandler, api: SapAPI) {
  const company = hdl.hana.getCompany();
  const query = `select v."DocEntry" from ${company}.ORDR v limit 1`;

  const resp = await hdl.hana.onSession(api.hana.get)(query);
  return resp;
}

/**
 * Complete Example - Based on src/server.ts initialization
 */
async function exampleUsage() {
  try {
    // 1. Initialize SAP connection with debug disabled (default)
    console.log('=== MODO SIN DEBUG ===');
    const { hdl, api } = SapProvider(false);

    // 2. Login to Service Layer
    const loginResult = await hdl.login();
    console.log('Login result:', loginResult);

    // 3. Use Service Layer API with auto-reconnect
    console.log('\n--- Service Layer Query ---');
    const ordersResult = await getOrdersBySl(hdl, api);
    console.log('Orders from Service Layer:', ordersResult);

    // 4. Use HANA Database API with auto-reconnect
    console.log('\n--- HANA Database Query ---');
    const hanaResult = await getOrdersByHana(hdl, api);
    console.log('Orders from HANA:', hanaResult);

    console.log('\n=== MODO CON DEBUG ===');
    // 5. Initialize with debug enabled
    const debugProvider = SapProvider(true);
    const debugLoginResult = await debugProvider.hdl.login();
    console.log('Debug login result:', debugLoginResult);

    const debugOrdersResult = await getOrdersBySl(debugProvider.hdl, debugProvider.api);
    console.log('Debug orders from Service Layer:', debugOrdersResult);

  } catch (error) {
    console.error('Error in SAP operations:', error);
  }
}

/**
 * Basic usage example
 */
async function basicExample() {
  // Get credentials from environment variables
  const credentials = SapConn();

  // Create session handler with debug options
  const debugOptions: SessionHandlerOptions = {
    debug: process.env.SAP_DEBUG === 'true'
  };
  const sessionHandler = SessionHandler(credentials, debugOptions);

  // Create API client
  const sapApi = SapApi();

  // Login to Service Layer
  const loginResult = await sessionHandler.login();
  console.log('Login result:', loginResult);

  // Use Service Layer API with auto-reconnect
  const wrappedGet = sessionHandler.onSession(sapApi.get);
  const businessPartners = await wrappedGet('BusinessPartners', 5);
  console.log('Business Partners:', businessPartners);

  // Use HANA API with auto-reconnect
  const wrappedHanaGet = sessionHandler.hana.onSession(sapApi.hana.get);
  const hanaData = await wrappedHanaGet('SELECT * FROM "OCRD" LIMIT 5');
  console.log('HANA Data:', hanaData);
}

export {
  exampleUsage,
  basicExample,
  SapProvider,
  getOrdersBySl,
  getOrdersByHana
};
