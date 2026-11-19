# Evaluacion-Castro

**Nombre:** Adolfo Castro  
**Usuario GitHub:** castro-bot

## Servicios

- **Agenda** (puerto 3001): mantiene médicos y cupos en memoria; reserva cupos por HTTP.
- **Citas** (puerto 3000): recibe solicitudes de pacientes, reserva en Agenda y avisa a Notificaciones por TCP; incluye reporte de primos en hilo trabajador.
- **Notificaciones** (puerto 4000): servidor TCP que recibe avisos de citas creadas (líneas JSON) y las registra en el log.

## Levantar el sistema

```bash
docker compose up -d --build
```

Comprobar:

```bash
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3001/health
```

Probar Notificaciones con el cliente TCP:

```bash
node cliente-tcp.mjs localhost 4000
node cliente-tcp.mjs localhost 4000 partido
node cliente-tcp.mjs localhost 4000 dos
node cliente-tcp.mjs localhost 4000 invalido
```

Sin Docker (tres terminales):

```bash
cd agenda && npm ci && npm run build && npm start
cd citas && npm ci && npm run build && npm start
cd notificaciones && npm ci && npm run build && npm start
```
