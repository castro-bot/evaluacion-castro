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
 * Envía un aviso a Notificaciones por TCP (una línea JSON + \n)
 * y espera la confirmación con timeout.
 * Patrón basado en enviar-linea.mjs (practica_before_examen1).
 * Nunca rechaza la promesa: siempre resuelve con { ok, motivo? }.
 */
export function notificarCitaCreada(
  host: string,
  port: number,
  aviso: AvisoCita,
  timeoutMs: number
): Promise<ResultadoNotificacion> {
  return new Promise((resolve) => {
    let terminado = false;
    let pendiente = "";

    const terminar = (resultado: ResultadoNotificacion) => {
      if (terminado) return;
      terminado = true;
      socket.destroy();
      resolve(resultado);
    };

    const socket = net.createConnection({ host, port }, () => {
      socket.write(JSON.stringify(aviso) + "\n");
    });

    socket.setEncoding("utf8");
    socket.setTimeout(timeoutMs);

    socket.on("data", (trozo: string) => {
      pendiente += trozo;
      const fin = pendiente.indexOf("\n");
      if (fin === -1) return;

      const linea = pendiente.slice(0, fin);
      try {
        const resp = JSON.parse(linea) as {
          ok?: boolean;
          recibido?: string;
          error?: string;
        };
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

    socket.on("timeout", () =>
      terminar({
        ok: false,
        motivo: `Notificaciones no respondió en ${timeoutMs} ms`,
      })
    );

    socket.on("error", (err: NodeJS.ErrnoException) =>
      terminar({
        ok: false,
        motivo: `No se pudo conectar con Notificaciones (${err.code ?? err.message})`,
      })
    );

    socket.on("close", () =>
      terminar({ ok: false, motivo: "conexión cerrada sin respuesta" })
    );
  });
}
