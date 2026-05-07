/* eslint-disable @typescript-eslint/no-explicit-any */

import { SingleResponse, CollectionResponse, SpecialResponse, SapErrorResponse } from "./types.js";

/**
 *
 */
async function parseError(res: Response): Promise<string> {
  // Clonamos la respuesta para poder leerla dos veces si es necesario
  const resClone = res.clone();
  try {
    const errorData = await res.json() as SapErrorResponse;
    return errorData?.error?.message?.value || JSON.stringify(errorData);
  } catch {
    // Si falla el JSON, leemos el clon como texto
    return resClone.text();
  }
}

/**
 *
 */
export async function handleResponse(res: Response): Promise<SingleResponse<any> | CollectionResponse<any> | SpecialResponse | null> {
  // 1. Errores HTTP (400–500)
  if (res.ok == false) {
    const errorMessage = await parseError(res);
    throw new Error(`SAP API request failed with status ${res.status}: ${errorMessage}`);
  }

  // se exrtrae el contenido y longitud de la respuesta
  const contentLength = res.headers.get("Content-Length");
  const raw = await res.text();

  if (
    res.status === 204       // 2. Respuestas sin contenido (204)
    || contentLength === "0" // 3. Respuestas con Content-Length = 0
    || !raw                  // 4. Respuestas sin Content-Length (chunked) pero sin body real
  ) {
    return null;
  }

  return JSON.parse(raw);
}

/**
 *
 */
export function isSessionExpired(message: string) {
  const expirationBanner = 'Invalid session or session already timeout';
  return message.includes(expirationBanner);
}

/**
 *
 */
export function validateAndCleanSql(sql: string): string {
  const trimmed = (sql ?? '').trim();
  if (!trimmed) {
    throw new Error('SQL query is empty');
  }
  const cleaned = trimmed.replace(/^--\s*\w+\s+/i, '').trim();
  if (/\b(update|insert|delete|drop|truncate|alter)\b/i.test(cleaned)) {
    throw new Error('Mutations (INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER) are forbidden in raw queries');
  }
  if (/^select\s+/i.test(cleaned)) {
    const hasLimit = /\slimit\s+(\d+)/i.test(cleaned);
    const hasTop = /^select\s+top\s+(\d+)/i.test(cleaned);
    if (!hasLimit && !hasTop) {
      throw new Error('SELECT statements must include TOP <n> or LIMIT <n> for performance safety');
    }
    const match = cleaned.match(/(?:limit|top)\s+(\d+)/i);
    const limitValue = match?.[1] ? parseInt(match[1], 10) : 0;
    if (limitValue > 1000 || limitValue <= 0) {
      throw new Error('Query limit must be between 1 and 1000');
    }
  }
  return cleaned;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
