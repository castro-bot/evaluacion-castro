import net from "node:net";

const PORT = Number(process.env.PORT ?? 4000);

interface AvisoEntrante {
  tipo?: string;
  citaId?: string;
  paciente?: string;
  medicoId?: string;
}

/**
 * Servidor TCP de Notificaciones.
 * Protocolo: una línea de texto con JSON terminada en \n.
 * Basado en el patrón de buffer de eco.ts (practica_before_examen1).
 */
const servidor = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let pendiente = "";

  socket.on("data", (trozo: string) => {
    pendiente += trozo;
    let fin = pendiente.indexOf("\n");

    while (fin !== -1) {
      const linea = pendiente.slice(0, fin);
      pendiente = pendiente.slice(fin + 1);

      const texto = linea.trim();
      let respuesta: string;

      try {
        const msg = JSON.parse(texto) as AvisoEntrante;
        console.log(
          `tipo=${msg.tipo ?? "?"} cita=${msg.citaId ?? "?"} paciente=${msg.paciente ?? "?"} medico=${msg.medicoId ?? "?"}`
        );
        respuesta = JSON.stringify({ ok: true, recibido: msg.citaId ?? "" });
      } catch {
        respuesta = JSON.stringify({ ok: false, error: "JSON inválido" });
      }

      socket.write(respuesta + "\n");
      fin = pendiente.indexOf("\n");
    }
  });

  socket.on("error", (err) => console.log("Error con el cliente:", err.message));
  socket.on("close", () => console.log("Cliente desconectado"));
});

servidor.listen(PORT, () => {
  console.log(`Servicio notificaciones (TCP) escuchando en ${PORT}`);
});
