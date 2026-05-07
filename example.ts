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
const options: SessionHandlerOptions = { debug: false };
const conn: SapCredentials = SapConn();
const api: SapAPI = SapProvider(conn, options);

/**
 * GET
 * el decorador @OnSession maneja
 * login y reintento automáticamente
 */
const orders: ApiRes<any> = await api.get('Orders?$top=1');
// if (orders.isOk) {
//   console.log('Órdenes:', orders.data);
// } else {
//   console.log('Expiracion:', orders.expired);
//   console.log('Error:', orders.mssg);
// }

/**
 * HANA
 * consulta SQL directa
 */
const rows: ApiRes<any> = await api.hana.query(`
  SELECT "DocNum", "CardCode", "DocTotal"
  FROM "${api.company}"."ORDR"
  LIMIT 5
`);
// if (rows.isOk) {
//   console.log('Filas HANA:', rows.data);
// } else {
//   console.log('Expiracion:', rows.expired);
//   console.log('Error:', rows.mssg);
// }

/**
 * BATCH
 *
 * implementacion de una funcion para crear el
 * payload para la llamada del tipo Batch
 */
function buildPayload(collection: string, records: any[]): [string, string] {
  const boundary = `batch_${Date.now()}`;
  const parts: string[] = [];

  records.forEach((record, idx) => {
    const part = [
      `--${boundary}`,
      'Content-Type: application/http',
      'Content-Transfer-Encoding: binary',
      `Content-ID: ${idx + 1}`,
      '',
      `PATCH /b1s/v1/${collection}('C002377') HTTP/1.1`,
      'Content-Type: application/json',
      'Accept: application/json',
      'B1S-ReplaceCollectionsOnPatch: false',
      '',
      JSON.stringify(record),
      '',
    ].join('\r\n');
    parts.push(part);
  });

  parts.push(`--${boundary}--`);

  console.log(parts)

  return [boundary, parts.join('\r\n')] as const;
}

/**
 * implementacion del metodo batch
 */
const records: any[] = [
  {
    NPI1Collection: [
      {
        LineId: 1,
        U_ItemCode: "101274",
        U_SpecialPrice: 1.0740,
      },
    ]
  }
];

const [boundary, body] = buildPayload('NPIL', records);

const resl = await api.batch('$batch', body, {
  'Content-Type': `multipart/mixed; boundary=${boundary}`,
  'Accept': 'multipart/mixed',
  'Prefer': 'odata.continue-on-error',
});

if (resl.isOk) {
  console.log('Resultado:', resl.data);
} else {
  console.log('Expiracion:', resl.expired);
  console.log('Error:', resl.mssg);
}
