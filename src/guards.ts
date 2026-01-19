import {
  ApiResponse,
  CollectionResponse,
  SingleResponse,
  SpecialResponse,
} from './types.js';

/**
 * Colección SAP
 */
export function isCollection<T>(res: any): res is CollectionResponse<T> {
  return (
    res &&
    typeof res === "object" &&
    Array.isArray(res.value)
  );
}

/**
 * Entidad única SAP
 */
export function isSingle<T>(res: any): res is SingleResponse<T> {
  return (
    res &&
    typeof res === "object" &&
    !Array.isArray(res.value) &&                // no debe ser array
    typeof res["odata.metadata"] === "string"  // debe tener metadata SAP
  );
}

/**
 * Respuesta especial SAP
 */
export function isSpecial(res: any): res is SpecialResponse {
  return (
    res &&
    typeof res === "object" &&
    res["odata.metadata"] === undefined        // no hay metadata
  );
}

/**
 * Type Guard para verificar si un objeto es una ApiResponse<T>
 */
export function isApiResponse<T>(
  obj: unknown,
  validateData?: (data: unknown) => data is T // Recibimos el isOrder aquí
): obj is ApiResponse<T> {

  const isBasicResponse = (
    typeof obj === 'object' &&
    obj !== null &&
    'isOk' in obj &&
    'mssg' in obj
  );

  if (!isBasicResponse) return false;

  // Si no pasamos validador, solo validamos la estructura básica
  if (!validateData) return true;

  // Si pasamos validador, comprobamos que 'data' cumpla con él
  return validateData((obj as any).data);
}
