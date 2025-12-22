/* eslint-disable @typescript-eslint/no-explicit-any */

import { SingleResponse, CollectionResponse, SpecialResponse, SapErrorResponse } from "./types.js";

/**
 *
 */
async function parseError(res: Response): Promise<string> {
  try {
    const errorData = await res.json() as SapErrorResponse;
    return errorData?.error?.message?.value || JSON.stringify(errorData);

  } catch {
    return res.text();
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

/* eslint-enable @typescript-eslint/no-explicit-any */