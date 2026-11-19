import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { notificarCitaCreada } from "./notificar";

const PORT = Number(process.env.PORT ?? 3000);
const AGENDA_URL = process.env.AGENDA_URL ?? "http://localhost:3001";
const AGENDA_TIMEOUT_MS = Number(process.env.AGENDA_TIMEOUT_MS ?? 2000);
const NOTIFICACIONES_HOST = process.env.NOTIFICACIONES_HOST ?? "localhost";
const NOTIFICACIONES_PORT = Number(process.env.NOTIFICACIONES_PORT ?? 4000);
const NOTIFICACIONES_TIMEOUT_MS = Number(process.env.NOTIFICACIONES_TIMEOUT_MS ?? 1000);
const REPORTE_N = Number(process.env.REPORTE_N ?? 8_000_000);

interface Cita {
  id: string;
  paciente: string;
  medicoId: string;
  creadaEn: string;
  notificada: boolean;
  motivoNotificacion?: string;
  cuposRestantes?: number;
}

const citas: Cita[] = [];
const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ estado: "ok", servicio: "citas" });
});

app.get("/citas", (_req: Request, res: Response) => {
  res.status(200).json(citas);
});

app.post("/citas", async (req: Request, res: Response) => {
  const { paciente, medicoId } = req.body ?? {};

  if (
    typeof paciente !== "string" ||
    paciente.trim() === "" ||
    typeof medicoId !== "string" ||
    medicoId.trim() === ""
  ) {
    res.status(400).json({ error: "paciente y medicoId son obligatorios" });
    return;
  }

  const inicio = performance.now();
  try {
    const r = await fetch(
      `${AGENDA_URL}/medicos/${encodeURIComponent(medicoId)}/reservar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(AGENDA_TIMEOUT_MS),
      }
    );

    if (r.status === 404 || r.status === 409) {
      let detalle: unknown;
      try {
        detalle = await r.json();
      } catch {
        detalle = { error: await r.text() };
      }
      console.log(`Agenda respondió ${r.status}:`, detalle);
      res.status(r.status).json(detalle);
      return;
    }

    if (r.status !== 200) {
      console.log(`Agenda respondió código inesperado ${r.status}`);
      res.status(502).json({
        error: "respuesta inesperada de Agenda",
        status: r.status,
      });
      return;
    }

    const reserva = (await r.json()) as { medicoId: string; cuposRestantes: number };

    const cita: Cita = {
      id: randomUUID(),
      paciente: paciente.trim(),
      medicoId,
      creadaEn: new Date().toISOString(),
      notificada: false,
      cuposRestantes: reserva.cuposRestantes,
    };

    const aviso = await notificarCitaCreada(
      NOTIFICACIONES_HOST,
      NOTIFICACIONES_PORT,
      {
        tipo: "CITA_CREADA",
        citaId: cita.id,
        paciente: cita.paciente,
        medicoId: cita.medicoId,
      },
      NOTIFICACIONES_TIMEOUT_MS
    );

    if (aviso.ok) {
      cita.notificada = true;
    } else {
      cita.notificada = false;
      cita.motivoNotificacion = aviso.motivo;
      console.log("Notificación fallida:", aviso.motivo);
    }

    citas.push(cita);
    res.status(201).json(cita);
  } catch (error) {
    const duracionMs = Math.round(performance.now() - inicio);
    const e = error as Error & { cause?: { code?: string } };
    const motivo =
      e.name === "TimeoutError"
        ? `Agenda no respondió en ${AGENDA_TIMEOUT_MS} ms`
        : `No se pudo conectar con Agenda (${e.cause?.code ?? e.message})`;
    console.log("Error con Agenda:", motivo);
    res.status(503).json({ error: "Agenda no disponible", motivo, duracionMs });
  }
});

function leerN(req: Request): number {
  const n = Number(req.query.n ?? REPORTE_N);
  return Number.isInteger(n) && n > 0 && n <= 50_000_000 ? n : REPORTE_N;
}

function contarPrimosEnWorker(n: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const archivo = path.join(__dirname, "worker-reporte.js");
    const w = new Worker(archivo, { workerData: { n } });
    w.once("message", (primos: number) => resolve(primos));
    w.once("error", reject);
    w.once("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker terminó con código ${code}`));
    });
  });
}

app.get("/reporte", async (req: Request, res: Response) => {
  const n = leerN(req);
  const inicio = performance.now();
  try {
    const primos = await contarPrimosEnWorker(n);
    const duracionMs = Math.round(performance.now() - inicio);
    res.status(200).json({
      modo: "worker",
      n,
      primos,
      citasRegistradas: citas.length,
      duracionMs,
    });
  } catch (error) {
    const e = error as Error;
    console.log("Error en worker de reporte:", e.message);
    res.status(500).json({ error: "Fallo en el hilo trabajador", detalle: e.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `Servicio citas en ${PORT}; Agenda=${AGENDA_URL} (timeout ${AGENDA_TIMEOUT_MS} ms); ` +
      `Notificaciones=${NOTIFICACIONES_HOST}:${NOTIFICACIONES_PORT}`
  );
});
