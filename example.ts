import type {
  SapAPI, // Estructura de la API
  SapCredentials, // formato para las credenciales para Service Layer/HANA
  SessionHandlerOptions, // Opciones para configurar el SessionHandler
} from './src/index.js';
import {
  SapConn, // objeto que concentra/gestiona las credenciales
  SapProvider // funcion que configura y sirve una instancia de la API
} from './src/index.js';

/**
 * inicializacion de la API
 */
const options: SessionHandlerOptions = { debug: false };
const conn: SapCredentials = SapConn();
const api: SapAPI = SapProvider(conn, options);

/**
 * GET
 * el decorador @OnSession maneja
 * login y reintento automáticamente
 */
const orders = await api.get('Orders?$top=5');

/**
 * HANA
 * consulta SQL directa
 */
const rows = await api.hana.query(`
  SELECT "DocNum", "CardCode", "DocTotal"
  FROM "${api.company}"."ORDR"
  LIMIT 5
`);

/**
 *
 */
console.log('Órdenes:', orders);
console.log('Filas HANA:', rows.data);
