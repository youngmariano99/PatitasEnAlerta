# Índice de pruebas manuales

| N | Nombre | Tag | Ticket |
|---|---|---|---|
| 1 | Agenda propia del veterinario — listado de turnos reservados | Backend | Endpoint de agenda propia del veterinario |
| 2 | Registro de entrada en la libreta sanitaria | Backend | Caso de uso RegistrarEntradaLibreta con verificación de autorización activa |
| 3 | Reserva de turno con un veterinario | Backend | Reutilización de ReservarTurnoCommand con proveedor_tipo='veterinario' |
| 4 | CRUD de autorizaciones a veterinarios sobre la libreta sanitaria | Backend | CRUD de autorizaciones_libreta controlado por el dueño |
| 5 | Consulta del historial cronológico de la libreta sanitaria | Backend | Endpoint de historial cronológico de libreta sanitaria por mascota |
| 6 | Publicación de solicitudes de recurso | Backend | Caso de uso PublicarSolicitudRecurso (Post-MVP, Módulo 5) |
| 7 | Directorio de aliados verificados | Backend | Endpoint de directorio filtrable por rol y zona (Post-MVP, Módulo 5) |
| 8 | Vista de seguimiento de colaboraciones con historial persistente | Backend | Vista de seguimiento de colaboraciones con historial persistente (Post-MVP, Módulo 5) |
| 9 | Búsqueda híbrida de reportes por similitud semántica | Backend | Búsqueda híbrida con pgvector sobre descripcion_embedding (Post-MVP, Módulo 5/9) |
| 10 | Registro de rescatista/activista vía Abstract Factory de formularios | Backend | Alta de usuario con rol rescatista vía Abstract Factory de formularios (Post-MVP, Módulo 5) |
| 11 | Ofrecimiento como colaborador sobre una solicitud de recurso | Backend | Comando OfrecerseComoColaboradorCommand (Post-MVP, Módulo 5) |
| 12 | Métricas personales de contribución | Backend-Frontend | Endpoint de métricas propias sin comparación pública (Post-MVP, Módulo 5) |
| 13 | Solicitudes de asistencia veterinaria filtradas por zona | Backend | Endpoint de solicitudes filtradas por zona y especialidad para veterinarios (Post-MVP, Módulo 5) |
| 14 | Recordatorios de turnos próximos con seguimiento de no-show | Backend | Job de recordatorios sobre turnos próximos con seguimiento de no-show (Post-MVP, Módulo 6) |
| 15 | CRUD de productos_veterinario y generación de pedidos | Backend | CRUD de productos_veterinario y comando GenerarPedidoCommand (Post-MVP, Módulo 6) |
