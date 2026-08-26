# Sitemap / Arquitectura de Información — Patitas en Alerta

```
/auth
 ├─ /login
 ├─ /registro                     (Dueño de mascota | Veterinario)
 └─ /recuperar-password

/panel                            (dashboard raíz, redirige según rol)

/mascotas
 ├─ /mascotas                     (mis mascotas registradas)
 ├─ /mascotas/nueva
 ├─ /mascotas/[id]                (ficha)
 └─ /mascotas/[id]/libreta        (historial cronológico + autorizaciones a veterinarios)

/reportes
 ├─ /reportes                     (listado + filtros + mapa — consulta pública sin login)
 ├─ /reportes/nuevo                (perdido | encontrado | problemática)
 └─ /reportes/[id]

/municipio                        (rol Municipio)
 ├─ /municipio/eventos
 ├─ /municipio/eventos/nuevo
 ├─ /municipio/turnera
 ├─ /municipio/dashboard
 └─ /municipio/adopciones          (alta/baja de fichas — Vitrina de Adopción)

/adopciones                       (consulta pública de la Vitrina de Adopción)

/veterinario                      (rol Veterinario)
 ├─ /veterinario/agenda           (define franjas — motor de turnera compartido)
 ├─ /veterinario/turnos
 └─ /veterinario/pacientes        (mascotas con libreta autorizada)

/turnos
 ├─ /turnos/reservar              (vecino: turno municipal o veterinario)
 └─ /turnos/mis-turnos

/admin
 ├─ /admin/verificaciones
 └─ /admin/auditoria
```

Cada carpeta ya existe como stub dentro de `app/` en este repositorio, lista para recibir su `page.tsx` real al implementar cada módulo.
