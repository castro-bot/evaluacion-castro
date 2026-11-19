#!/usr/bin/env node
/**
 * Cliente de prueba para Notificaciones (TCP, líneas JSON).
 * Uso:
 *   node cliente-tcp.mjs localhost 4000
 *   node cliente-tcp.mjs localhost 4000 partido
 *   node cliente-tcp.mjs localhost 4000 dos
 *   node cliente-tcp.mjs localhost 4000 invalido
 */
import net from "node:net";

const host = process.argv[2] ?? "localhost";
const port = Number(process.argv[3] ?? 4000);
const modo = process.argv[4] ?? "normal";

const aviso = {
  tipo: "CITA_CREADA",
  citaId: "cita-prueba-001",
  paciente: "Adolfo Castro",
  medicoId: "MED-01",
};

const socket = net.createConnection({ host, port }, () => {
  if (modo === "partido") {
    const linea = JSON.stringify(aviso) + "\n";
    const mitad = Math.floor(linea.length / 2);
    socket.write(linea.slice(0, mitad));
    setTimeout(() => socket.write(linea.slice(mitad)), 50);
  } else if (modo === "dos") {
    const a = { ...aviso, citaId: "cita-a" };
    const b = { ...aviso, citaId: "cita-b" };
    socket.write(JSON.stringify(a) + "\n" + JSON.stringify(b) + "\n");
  } else if (modo === "invalido") {
    socket.write("esto no es json\n");
  } else {
    socket.write(JSON.stringify(aviso) + "\n");
  }
});

socket.setEncoding("utf8");
socket.on("data", (data) => {
  process.stdout.write(data);
});
socket.on("error", (err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
socket.on("end", () => process.exit(0));
setTimeout(() => {
  socket.end();
}, 500);
