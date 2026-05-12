<h1 align="left">
  <img src="https://i.postimg.cc/d32qs7f4/sap-bridge.jpg" width="90" align="absmiddle">
  &nbsp;
  SAP Bridge
</h1>

Este es un wrapper TypeScript para interactuar con dos sistemas SAP: el Service Layer (API OData REST de SAP Business One) y la base de datos SAP HANA.

---

## Arquitectura general

```
SapConn()           → lee credenciales de variables de entorno
SapProvider()       → factory: crea SessionHandler + SapApi listos para usar
SessionHandler      → maneja el ciclo de vida de la sesión (login, storage, expiración)
SapApi              → cliente HTTP con métodos get/post/patch + consultas HANA
```

---

## Flujo de una llamada a la API

1. Se llama `api.get("Orders")` (decorado con `@OnSession`)
2. El decorador verifica si hay sesión activa; si no, hace `login()` automáticamente
3. Inyecta `session` y `apiUrl` al método real
4. Si la respuesta indica sesión expirada (`expired: true`), limpia la sesión, re-loguea y reintenta

Para HANA, el decorador `@OnHana` inyecta los parámetros de conexión y ejecuta la query con `@sap/hana-client`.

---

## Almacenamiento de sesión (dos modos)

| Modo | Clase | Cuándo usar |
|------|-------|-------------|
| `json` **(default)** | `JsonFileSessionAdapter` | Desarrollo local o apps single-process |
| `redis` | `RedisSessionAdapter` | Entornos multi-proceso/servidor |

La sesión guarda: `{ id, node, timeout }` — el `B1SESSION` cookie y el `ROUTEID`.

> Redis es una dependencia **opcional**. Solo es necesario instalarla si se usa `storageType: 'redis'`:
> ```bash
> npm install redis
> ```

---

## Respuesta unificada

Todos los métodos devuelven `ApiResponse<T>`:
```ts
{ isOk: boolean, mssg: string, data?: T, expired?: boolean }
```

SAP Service Layer puede responder en tres formatos distintos. La librería los clasifica internamente con type guards y siempre expone el mismo `ApiResponse`:

| Formato SAP | Guard | `data` que recibe el usuario |
|-------------|-------|------------------------------|
| Colección (`value: T[]`) | `isCollection` | El array directo |
| Entidad única (`odata.metadata` + objeto) | `isSingle` | El objeto completo |
| Especial (sin `odata.metadata`) | `isSpecial` | El objeto tal cual |
| Sin body (HTTP 204) | — | `undefined` |

El usuario nunca necesita distinguir el formato SAP — siempre accede a `result.data`.

---

## Variables de entorno requeridas

```bash
# Service Layer
SAP_API_COMPANY=...
SAP_API_SL_URL=...
SAP_API_SL_UID=...
SAP_API_SL_PWD=...
SAP_API_SL_STG=...

# HANA
SAP_API_HN_URL=...
SAP_API_HN_UID=...
SAP_API_HN_PWD=...
SAP_API_HN_SSL=...
```

---

## Uso típico

```ts
const api = SapProvider(SapConn(), { debug: true });

// GET — sesión manejada automáticamente por @OnSession
const result = await api.get('Orders?$top=10');
if (result.isOk) console.log(result.data);

// HANA — consulta SQL directa
const rows = await api.hana.query(`
  SELECT "DocNum", "CardCode", "DocTotal"
  FROM "${api.company}"."ORDR"
  LIMIT 10
`);
if (rows.isOk) console.log(rows.data);
```

---

## Batch requests

El método `batch()` permite enviar múltiples operaciones en una sola llamada HTTP usando el protocolo `multipart/mixed` de SAP.

El payload debe construirse manualmente — cada parte es una operación HTTP independiente:

```ts
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
      `POST /b1s/v1/${collection} HTTP/1.1`,
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
  return [boundary, parts.join('\r\n')] as const;
}

const [boundary, body] = buildPayload('MyCollection', records);

const result = await api.batch('$batch', body, {
  'Content-Type': `multipart/mixed; boundary=${boundary}`,
  'Accept': 'multipart/mixed',
  'Prefer': 'odata.continue-on-error',
});

if (result.isOk) {
  // result.data es el string multipart crudo de la respuesta SAP
  console.log(result.data);
} else {
  console.log('Error:', result.mssg);
}
```

> La respuesta de SAP (`result.data`) es un string `multipart/mixed` crudo que debe parsearse según las necesidades de cada caso.

---
