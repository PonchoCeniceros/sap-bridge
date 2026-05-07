import type {
  SapAPI, // Estructura de la API
  SapCredentials, // formato para las credenciales para Service Layer/HANA
  SessionHandlerOptions, // Opciones para configurar el SessionHandler
  ApiResponse as ApiRes, // respuesta comun a toda la libreria
} from './src/index.js';
import {
  SapConn, // objeto que concentra/gestiona las credenciales
  SapProvider // funcion que configura y sirve una instancia de la API
} from './src/index.js';

/**
 * inicializacion de la API
 */
const options: SessionHandlerOptions = { debug: true };
const conn: SapCredentials = SapConn();
const api: SapAPI = SapProvider(conn, options);

/**
 * GET
 * el decorador @OnSession maneja
 * login y reintento automáticamente
 */
const orders: ApiRes<any> = await api.get('Orders?$top=5');
if (orders.isOk) {
  console.log('Órdenes:', orders.data);
} else {
  console.log('Expiracion:', orders.expired);
  console.log('Error:', orders.mssg);
}

/**
 * HANA
 * consulta SQL directa
 */
const rows: ApiRes<any> = await api.hana.query(`
  SELECT "DocNum", "CardCode", "DocTotal"
  FROM "${api.company}"."ORDR"
  LIMIT 5
`);
if (rows.isOk) {
  console.log('Filas HANA:', rows.data);
} else {
  console.log('Expiracion:', rows.expired);
  console.log('Error:', rows.mssg);
}
