import { createClient, RedisClientType } from "redis";
import { SapSession, SessionStorageAdapter } from "../types.js";

/**
 * Adaptador de almacenamiento usando Redis
 */
export class RedisSessionAdapter implements SessionStorageAdapter {
  private client: RedisClientType | null = null;
  private redisUrl: string;
  private isDebug: boolean;

  constructor(redisUrl: string, isDebug: boolean = false) {
    this.redisUrl = redisUrl;
    this.isDebug = isDebug;
  }

  /**
   * Obtiene la conexión Redis, creándola si no existe
   */
  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = createClient({ url: this.redisUrl });
      this.client.on('error', (err) => {
        if (this.isDebug) {
          console.warn(`[Redis] Connection error: ${err.message}`);
        }
      });
    }
    return this.client;
  }

  /**
   * Obtiene la sesión desde Redis
   * Si Redis no está disponible, retorna null (manejo graceful)
   */
  async getSession(): Promise<SapSession | null> {
    try {
      const client = await this.getClient();

      // Intentar conectar si no está conectado
      if (!client.isOpen) {
        await client.connect();
      }

      const sessionString = await client.get("b1_session");
      const session = sessionString ? JSON.parse(sessionString) : null;

      if (this.isDebug) {
        console.log(`[Redis] Sesión extraída: ${session ? session.id : 'none'}`);
      }

      return session;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido en la sesión";
      if (this.isDebug) {
        console.warn(`[Redis] Error al extraer sesión: ${message}`);
      }
      // Retornar null para manejo graceful cuando Redis no está disponible
      return null;
    }
  }

  /**
   * Guarda la sesión en Redis
   * Si falla, lanza error (persistir sesión es crítico)
   */
  async setSession(session: SapSession): Promise<void> {
    try {
      const client = await this.getClient();

      // Intentar conectar si no está conectado
      if (!client.isOpen) {
        await client.connect();
      }

      await client.set("b1_session", JSON.stringify(session));

      if (this.isDebug) {
        console.log(`[Redis] Sesión almacenada: ${session.id}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido en la sesión";
      if (this.isDebug) {
        console.error(`[Redis] Error al almacenar la sesión: ${message}`);
      }
      throw new Error(`Error en el almacenamiento Redis: ${message}`);
    }
  }

  /**
   * Limpia la sesión de Redis
   * Si falla, lanza error (limpiar sesión es importante para seguridad)
   */
  async cleanSession(): Promise<void> {
    try {
      const client = await this.getClient();

      // Intentar conectar si no está conectado
      if (!client.isOpen) {
        await client.connect();
      }

      await client.del("b1_session");

      if (this.isDebug) {
        console.log(`[Redis] Sesión eliminada`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido en la sesión";
      if (this.isDebug) {
        console.error(`[Redis] Error al eliminar la sesión: ${message}`);
      }
      throw new Error(`Error al eliminar sesión en Redis: ${message}`);
    }
  }

  /**
   * Cierra la conexión Redis (útil para cleanup)
   */
  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.client = null;
    }
  }
}
