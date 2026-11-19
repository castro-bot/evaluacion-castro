import net from "node:net";

const PORT = Number(process.env.PORT ?? 4000);

interface AvisoEntrante {
  tipo?: string;
  citaId?: string;
  paciente?: string;
  medicoId?: string;
}

function procesarLinea(linea: string): string {
  const texto = linea.trim();
  if (texto === "") {
    return JSON.stringify({ ok: false, error: "JSON inválido" });
  }

  try {
    const msg = JSON.parse(texto) as AvisoEntrante;
    console.log(
      `tipo=${msg.tipo ?? "?"} cita=${msg.citaId ?? "?"} paciente=${msg.paciente ?? "?"} medico=${msg.medicoId ?? "?"}`
    );
    return JSON.stringify({ ok: true, recibido: msg.citaId ?? "" });
  } catch {
    return JSON.stringify({ ok: false, error: "JSON inválido" });
  }
}

/**
 * Acumula chunks TCP y responde una línea por cada mensaje completo (\n).
 * Soporta mensajes partidos, varios mensajes en un chunk y JSON inválido.
 */
function manejarConexion(socket: net.Socket): void {
  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");

    let nl = buffer.indexOf("\n");
    while (nl !== -1) {
      const linea = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      const respuesta = procesarLinea(linea);
      socket.write(respuesta + "\n");
      nl = buffer.indexOf("\n");
    }
  });

  socket.on("error", (err) => {
    console.log("Error en socket:", err.message);
  });
}

const server = net.createServer(manejarConexion);

server.listen(PORT, () => {
  console.log(`Servicio notificaciones (TCP) escuchando en ${PORT}`);
});
