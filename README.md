# SAP Module

Módulo TypeScript para conectar con SAP Service Layer y HANA Database.

## Instalación

```bash
npm install @ponchoceniceros/sap
```

## Uso básico

```typescript
import { SapConn, SapApi, SessionHandler } from '@ponchoceniceros/sap';
import type { SapCredentials, SapAPI, SapSessionHandler } from '@ponchoceniceros/sap';

// Configurar credenciales
const credentials = SapConn();

// Crear handler de sesión
const sessionHandler = SessionHandler(credentials);

// Crear API client
const sapApi = SapApi();

// Login
await sessionHandler.login();

// Ejemplo de uso con Service Layer
const wrappedGet = sessionHandler.onSession(sapApi.get);
const result = await wrappedGet('BusinessPartners', '$top=10');

// Ejemplo de uso con HANA
const wrappedHanaGet = sessionHandler.hana.onSession(sapApi.hana.get);
const hanaResult = await wrappedHanaGet('SELECT * FROM "MY_TABLE" LIMIT 10');
```

## Patrones de uso en aplicación real

### 1. Provider Pattern (Recomendado)

Basado en `src/orders/providers.ts`:

```typescript
import { SapConn, SapApi, SessionHandler } from '@ponchoceniceros/sap';
import type { SapCredentials, SapAPI, SapSessionHandler } from '@ponchoceniceros/sap';

/**
 * Proveedor centralizado de servicios SAP
 */
function SapProvider() {
  const credentials: SapCredentials = SapConn();
  const hdl: SapSessionHandler = SessionHandler(credentials);
  const api: SapAPI = SapApi();

  return { hdl, api };
}

// Uso en la aplicación
const { hdl, api } = SapProvider();
```

### 2. Service Layer Queries

Basado en `src/application/orders.ts`:

```typescript
import type { SapAPI, SapSessionHandler } from '@ponchoceniceros/sap';

/**
 * Consulta de órdenes desde Service Layer
 */
async function getOrdersBySl(hdl: SapSessionHandler, api: SapAPI) {
  // Documento específico
  const query = `Orders(2832)`;
  
  // Lista con filtros
  // const query = `Orders?$filter=DocNum eq 986&$select=DocNum,DocEntry,DocumentLines`;
  
  // Lista simple
  // const query = `Orders?$select=DocNum,DocEntry`;

  const resp = await hdl.onSession(api.get)(query, 10);
  return resp;
}
```

### 3. HANA Database Queries

```typescript
/**
 * Consulta de órdenes desde HANA Database
 */
async function getOrdersByHana(hdl: SapSessionHandler, api: SAP) {
  const company = hdl.hana.getCompany();
  const query = `select v."DocEntry" from ${company}.ORDR v limit 1`;

  const resp = await hdl.hana.onSession(api.hana.get)(query);
  return resp;
}
```

### 4. Inicialización de la aplicación

Basado en `src/server.ts`:

```typescript
import "dotenv/config";
import { SapConn, SessionHandler } from '@ponchoceniceros/sap';

// Inicialización al iniciar el servidor
async function initializeApp() {
  const credentials = SapConn();
  const hdl = SessionHandler(credentials);
  await hdl.login();
  
  console.log('SAP Service Layer inicializado');
  return hdl;
}
```

### 5. Imports de tipos optimizados

```typescript
// Importar solo tipos (mejor control)
import type { SapAPI, SapSessionHandler, ApiResponse } from '@ponchoceniceros/sap';

// Importar implementaciones
import { SapConn, SapApi, SessionHandler } from '@ponchoceniceros/sap';

// Funciones tipadas
function processResponse(response: ApiResponse<unknown>) {
  // ...
}
```

## Variables de entorno

```bash
# Service Layer
SAP_API_SL_URL=https://your-sap-server:50000/b1s/v1
SAP_API_COMPANY=YOUR_COMPANY_DB
SAP_API_SL_UID=your_username
SAP_API_SL_PWD=your_password
SAP_API_SL_STG=redis://localhost:6379

# HANA Database
SAP_API_HN_URL=hanadb:30015
SAP_API_HN_UID=your_hana_user
SAP_API_HN_PWD=your_hana_password
SAP_API_HN_SSL=false

# Debug mode (opcional)
SAP_DEBUG=true
```

## Configuración de Almacenamiento de Sesiones

### Tipos de Almacenamiento

El módulo soporta dos tipos de almacenamiento para sesiones:

1. **Redis** (por defecto): Almacenamiento en memoria Redis
2. **JSON**: Almacenamiento en archivo JSON local

### Configuración de Redis (Predeterminado)

```typescript
// Usando variable de entorno (recomendado)
process.env.SAP_API_SL_STG = 'redis://localhost:6379';

const sessionHandler = SessionHandler(credentials);

// O especificando URL directamente
const sessionHandler = SessionHandler(credentials, {
  storageType: 'redis',
  redisUrl: 'redis://localhost:6379'
});
```

### Configuración de JSON File

```typescript
const sessionHandler = SessionHandler(credentials, {
  storageType: 'json',
  jsonFilePath: './my-sap-session.json'  // opcional, default: './sap-session.json'
});
```

### Manejo de Errores de Redis

Cuando Redis no está disponible, el módulo maneja los errores gracefully:

- **getSession()**: Retorna `null` si Redis no está disponible (fuerza login fresco)
- **setSession()**: Registra warning pero permite que la aplicación continúe
- **Aplicación**: Sigue funcionando normalmente sin persistencia de sesiones

```typescript
// La aplicación funciona incluso si Redis está caído
const sessionHandler = SessionHandler(credentials, { debug: true });
await sessionHandler.login(); // Funciona, pero no persiste la sesión

// Las llamadas API funcionan para la sesión actual
const result = await sessionHandler.onSession(api.get)('BusinessPartners');
```

## Modo Debug

### Habilitar debug por variable de entorno
```bash
export SAP_DEBUG=true
```

### Habilitar debug en código
```typescript
// Opción 1: Por variable de entorno
const sessionHandler = SessionHandler(credentials);

// Opción 2: Parámetro explícito
const sessionHandler = SessionHandler(credentials, { debug: true });

// Opción 3: Combinación con opciones de almacenamiento
const sessionHandler = SessionHandler(credentials, {
  debug: true,
  storageType: 'json',
  jsonFilePath: './debug-session.json'
});
```

### Comportamiento del modo debug
El modo debug se activa automáticamente si:
- `SAP_DEBUG=true` (variable de entorno)
- `NODE_ENV=development` (desarrollo)
- `options.debug = true` (parámetro explícito)

- **Debug activado**: Muestra logs de conexión, reintentos, sesiones, etc.
- **Debug desactivado**: Oculta todos los logs internos (silencioso)

**Logs disponibles:**
- `[🔧] Debug mode: ON` (estado del modo debug)
- `[🔧] SAP_DEBUG: {valor}` (valor de variable)
- `[🔧] NODE_ENV: {valor}` (entorno actual)
- `[📁] sesion previa existente: {sessionId}`
- `[📁] nueva sesion cargada: {sessionId}`
- `[📁] primer intento de uso de la sesion...`
- `[📁] la sesión falló, segundo intento...`
- `[📁] inyeccion de los parametros de conexion a la db...`

## API Reference

### Functions
- **`SapConn()`**: Obtiene credenciales desde variables de entorno
- **`SapApi()`**: Crea cliente para SAP Service Layer y HANA
- **`SessionHandler(credentials, options?)**: Maneja sesiones con auto-reconnect

**Opciones de SessionHandler:**
```typescript
interface SessionHandlerOptions {
  debug?: boolean;                    // Mostrar/ocultar logs de debug (default: process.env.SAP_DEBUG)
  storageType?: 'redis' | 'json';     // Tipo de almacenamiento (default: 'redis')
  jsonFilePath?: string;              // Ruta del archivo JSON (default: './sap-session.json')
  redisUrl?: string;                  // URL de Redis (opcional, sobrescribe SAP_API_SL_STG)
  colors?: {                          // Colores personalizados para logs
    RED?: string;
    GREEN?: string;
    BLUE?: string;
    CIAN?: string;
  };
}
```

### Types
- **`SapCredentials`**: Interfaz de credenciales SAP
- **`SapAPI`**: Interfaz del cliente API
- **`SapSessionHandler`**: Interfaz del handler de sesión
- **`ApiResponse<T>`**: Respuesta genérica de API
- **`SapSession`**: Información de sesión activa

### Métodos principales

#### Service Layer
```typescript
hdl.onSession(api.get)(endpoint: string, maxPageSize?: number)
```

#### HANA Database
```typescript
hdl.hana.onSession(api.hana.get)(query: string)
hdl.hana.getCompany() // Returns company database
```

## Características

- ✅ Auto-reconnect de sesiones
- ✅ Tipado completo con TypeScript
- ✅ Soporte para Service Layer y HANA
- ✅ Manejo de errores centralizado
- ✅ Almacenamiento flexible: Redis o JSON files
- ✅ Resistente a fallos de Redis (graceful degradation)
- ✅ Imports optimizados de tipos

## Licencia

MIT