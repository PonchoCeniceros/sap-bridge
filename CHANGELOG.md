# Changelog

---

## [0.0.4]

### Agregado
- Método `batch()` en `SapApi` para enviar múltiples operaciones en una sola llamada HTTP usando el protocolo `multipart/mixed` de SAP
- Validaciones de seguridad y rendimiento en `api.hana.query()`: bloqueo de mutaciones (INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER) y límite obligatorio de resultados (TOP / LIMIT, máximo 1000)
- Función `validateAndCleanSql()` exportada desde `utils.ts`

### Cambiado
- El almacenamiento de sesión por defecto cambia de Redis a JSON (`sap.json`) — la librería funciona sin dependencias externas
- `redis` movido a `optionalDependencies` con import dinámico — solo se instala y carga si se usa `storageType: 'redis'`
- `login()` ya no lanza excepciones — retorna `ApiResponse { isOk: false }` en caso de error
- `api.hana.query()` ya no lanza excepciones — retorna `ApiResponse { isOk: false }` en caso de error
- `cleanSession()` en el decorador `@OnSession` ahora está blindado con try/catch y retorna `ApiResponse` si falla

---

## [0.0.3]

### Agregado
- Decoradores TypeScript (`@OnSession`, `@OnHana`) para manejo automático de sesión e inyección de parámetros
- Patrón Provider: función `SapProvider()` como factory principal de la librería
- Reintento automático cuando la sesión expira mid-request en `@OnSession`

### Cambiado
- Ajustes al objeto `SessionHandler` y `SapApi` para mejor manejo de excepciones
- Correcciones en los decoradores

---

## [0.0.2]

### Agregado
- Soporte para PATCH y POST en `SapApi`
- Almacenamiento de sesión con adaptadores intercambiables: `RedisSessionAdapter` y `JsonFileSessionAdapter`
- Interfaz `SessionStorageAdapter` para permitir implementaciones personalizadas
- Type guard `isApiResponse<T>()` para validar respuestas en tiempo de ejecución
- Mejoras a los tipos: `CollectionResponse`, `SingleResponse`, `SpecialResponse`

---

## [0.0.1]

### Agregado
- Release inicial
- Integración con SAP Service Layer (GET) con reconexión automática
- Soporte para conexión a SAP HANA Database
- Soporte completo de TypeScript
- Modo debug con logging configurable
- Soporte de configuración TLS/SSL
