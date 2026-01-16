// Example based on real application usage
import { SapConn, SapApi, SessionHandler } from '@ponchoceniceros/sap';
import type { SapCredentials, SapAPI, SapSessionHandler, SessionHandlerOptions } from '@ponchoceniceros/sap';

/**
 * Provider Pattern - Centralized SAP Configuration
 * Based on src/orders/providers.ts
 */
function SapProvider(debug?: boolean, storageType?: 'redis' | 'json', jsonFilePath?: string) {
  const credentials: SapCredentials = SapConn();
  const options: SessionHandlerOptions = {
    debug: debug ?? false,
    storageType: storageType ?? 'redis',
    jsonFilePath: jsonFilePath
  };
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

/**
 * Example using JSON file storage instead of Redis
 */
async function jsonStorageExample() {
  // Get credentials from environment variables
  const credentials = SapConn();

  // Create session handler with JSON file storage
  const jsonOptions: SessionHandlerOptions = {
    debug: true,
    storageType: 'json',
    jsonFilePath: './my-sap-session.json'
  };
  const sessionHandler = SessionHandler(credentials, jsonOptions);
  const sapApi = SapApi();

  console.log('=== Using JSON File Storage ===');

  // Login to Service Layer (session will be saved to JSON file)
  const loginResult = await sessionHandler.login();
  console.log('Login result:', loginResult);

  // Make an API call
  const wrappedGet = sessionHandler.onSession(sapApi.get);
  const businessPartners = await wrappedGet('BusinessPartners', 5);
  console.log('Business Partners:', businessPartners);

  // The session is automatically saved to the JSON file
  console.log('Session saved to JSON file');
}

/**
 * Example handling Redis unavailability gracefully
 */
async function redisFallbackExample() {
  // Get credentials from environment variables
  const credentials = SapConn();

  // Create session handler with Redis storage
  const redisOptions: SessionHandlerOptions = {
    debug: true,
    storageType: 'redis',
    redisUrl: 'redis://localhost:6379' // This Redis instance might not be running
  };
  const sessionHandler = SessionHandler(credentials, redisOptions);
  const sapApi = SapApi();

  console.log('=== Redis Fallback Example ===');
  console.log('If Redis is not running, the application will continue working');

  try {
    // This will work even if Redis is down
    const loginResult = await sessionHandler.login();
    console.log('Login result:', loginResult);

    // Make an API call - session works for this request
    const wrappedGet = sessionHandler.onSession(sapApi.get);
    const businessPartners = await wrappedGet('BusinessPartners', 5);
    console.log('Business Partners:', businessPartners);

    console.log('Note: Session is not persisted when Redis is unavailable');
  } catch (error) {
    console.error('Error:', error);
  }
}

export {
  exampleUsage,
  basicExample,
  jsonStorageExample,
  redisFallbackExample,
  SapProvider,
  getOrdersBySl,
  getOrdersByHana
};
