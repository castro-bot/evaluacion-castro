import net from "node:net";

export interface AvisoCita {
  tipo: "CITA_CREADA";
  citaId: string;
  paciente: string;
  medicoId: string;
}

export interface ResultadoNotificacion {
  ok: boolean;
  motivo?: string;
}

/**
 * Abre un socket TCP, envía una línea JSON y espera la confirmación
 * con timeout. Nunca lanza: siempre resuelve con ok/motivo.
 */
export function notificarCitaCreada(
  host: string,
  port: number,
  aviso: AvisoCita,
  timeoutMs: number
): Promise<ResultadoNotificacion> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let buffer = "";
    let finalizado = false;

    const terminar = (resultado: ResultadoNotificacion) => {
      if (finalizado) return;
      finalizado = true;
      socket.destroy();
      resolve(resultado);
    };

    socket.setTimeout(timeoutMs);

    socket.once("timeout", () => {
      terminar({
        ok: false,
        motivo: `Notificaciones no respondió en ${timeoutMs} ms`,
      });
    });

    socket.once("error", (err: NodeJS.ErrnoException) => {
      terminar({
        ok: false,
        motivo: `No se pudo conectar con Notificaciones (${err.code ?? err.message})`,
      });
    });

    socket.connect(port, host, () => {
      socket.write(JSON.stringify(aviso) + "\n");
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const nl = buffer.indexOf("\n");
      if (nl === -1) return;

      const linea = buffer.slice(0, nl).trim();
      try {
        const resp = JSON.parse(linea) as { ok?: boolean; recibido?: string; error?: string };
        if (resp.ok === true && resp.recibido === aviso.citaId) {
          terminar({ ok: true });
        } else {
          terminar({
            ok: false,
            motivo: resp.error ?? "Confirmación de Notificaciones inválida",
          });
        }
      } catch {
        terminar({ ok: false, motivo: "Respuesta de Notificaciones no es JSON válido" });
      }
    });
  });
}
