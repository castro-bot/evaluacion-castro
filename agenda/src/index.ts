import express, { Request, Response } from "express";

const PORT = Number(process.env.PORT ?? 3001);
const RETARDO_MS = Number(process.env.RETARDO_MS ?? 0);

interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
  cupos: number;
}

const medicos: Medico[] = [
  { id: "MED-01", nombre: "Dra. Kaori Mizuno", especialidad: "Medicina general", cupos: 20 },
  { id: "MED-02", nombre: "Dr. Toru Hoshino", especialidad: "Pediatría", cupos: 1 },
  { id: "MED-03", nombre: "Dr. Renji Okada", especialidad: "Cardiología", cupos: 0 },
  { id: "MED-04", nombre: "Dra. Aya Fujimoto", especialidad: "Dermatología", cupos: 6 },
  { id: "MED-05", nombre: "Dr. Kenji Watanabe", especialidad: "Oftalmología", cupos: 4 },
];

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ estado: "ok", servicio: "agenda" });
});

app.get("/medicos", (_req: Request, res: Response) => {
  res.status(200).json(medicos);
});

app.post("/medicos/:id/reservar", async (req: Request<{ id: string }>, res: Response) => {
  if (RETARDO_MS > 0) await esperar(RETARDO_MS);

  const medico = medicos.find((m) => m.id === req.params.id);
  if (!medico) {
    res.status(404).json({ error: "Médico no encontrado", medicoId: req.params.id });
    return;
  }

  if (medico.cupos <= 0) {
    res.status(409).json({
      error: "No quedan cupos",
      medicoId: medico.id,
      cuposRestantes: 0,
    });
    return;
  }

  medico.cupos -= 1;
  res.status(200).json({ medicoId: medico.id, cuposRestantes: medico.cupos });
});

app.listen(PORT, () => {
  console.log(`Servicio agenda escuchando en ${PORT}, RETARDO_MS=${RETARDO_MS}`);
});
