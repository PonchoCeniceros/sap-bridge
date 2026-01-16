import { promises as fs } from "fs";
import { SapSession, SessionStorageAdapter } from "../types.js";

/**
 * Adaptador de almacenamiento usando archivo JSON
 */
export class JsonFileSessionAdapter implements SessionStorageAdapter {
  private filePath: string;
  private isDebug: boolean;

  constructor(filePath: string, isDebug: boolean = false) {
    this.filePath = filePath;
    this.isDebug = isDebug;
  }

  /**
   * Obtiene la sesión desde el archivo JSON
   */
  async getSession(): Promise<SapSession | null> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const session = JSON.parse(data) as SapSession;

      if (this.isDebug) {
        console.log(`[JSON] Sesión extraída: ${session.id}`);
      }

      return session;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown session error";
      if (this.isDebug) {
        console.log(`[JSON] Archivo de sesión no encontrado ó sesión inválida: ${message}`);
      }
      return null;
    }
  }

  /**
   * Guarda la sesión en el archivo JSON
   * Usa escritura atómica (temp file + rename) para evitar corrupción
   */
  async setSession(session: SapSession): Promise<void> {
    try {
      const tempPath = `${this.filePath}.tmp`;
      const data = JSON.stringify(session, null, 2);

      // Escribir a archivo temporal primero
      await fs.writeFile(tempPath, data, 'utf-8');

      // Renombrar para escritura atómica
      await fs.rename(tempPath, this.filePath);

      if (this.isDebug) {
        console.log(`[JSON] Sesión almacenada: ${session.id}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown session error";
      if (this.isDebug) {
        console.error(`[JSON] Error al almacenar la sesión: ${message}`);
      }
      throw new Error(`JSON saving session error: ${message}`);
    }
  }

  /**
   * Limpia la sesión eliminando el archivo
   */
  async cleanSession(): Promise<void> {
    try {
      await fs.unlink(this.filePath);

      if (this.isDebug) {
        console.log(`[JSON] Sesión eliminada`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown session error";
      // No lanzar error si el archivo no existe (ya está limpio)
      if (!message.includes('ENOENT')) {
        if (this.isDebug) {
          console.error(`[JSON] Error al eliminar la sesión: ${message}`);
        }
        throw new Error(`JSON cleaning session error: ${message}`);
      }
    }
  }
}
