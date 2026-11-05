# 📋 TAREAS PENDIENTES — AXEL PLAY
**Última actualización:** 01 de Noviembre de 2026

Lista ordenada por prioridad para las siguientes iteraciones y ciclos de desarrollo:

---

## 1. INFRAESTRUCTURA Y DESPLIEGUE (ALTA PRIORIDAD)
- [ ] Configurar repositorio remoto en GitHub/GitLab para automatización CI/CD.
- [ ] Configurar proyecto en Cloudflare Pages con compilación automática de `npm run build` y directorio de salida `dist`.
- [ ] Configurar variables de entorno de producción en el panel de Cloudflare Pages (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`).
- [ ] Asignar dominio personalizado seguro con HTTPS automático sin costo.

## 2. MODOS DE JUEGO ADICIONALES (MEDIA PRIORIDAD)
- [ ] **Escape Room Educativo (Modo 5):**
  - Implementar selector visual de habitaciones con candados virtuales.
  - Añadir pistas desbloqueables por tiempo y acertijos encadenados.
- [ ] **Ruleta del Conocimiento (Modo 6):**
  - Componente de rueda giratoria animada SVG/Canvas con parada desacelerada por física.
- [ ] **Detecta el Error (Modo 7):**
  - Selector de áreas interactivas (hotspots) sobre imágenes de señalización y procedimientos.
- [ ] **Ordena y Gana (Modo 8):**
  - Integrar `@dnd-kit/sortable` para ordenar cronologías, jerarquías de normas y secuencias de pasos.

## 3. GAMIFICACIÓN AVANZADA Y RECOMPENSAS (MEDIA PRIORIDAD)
- [ ] Sistema de rachas con multiplicador de puntos (x1.2, x1.5, x2).
- [ ] Catálogo expandido de avatares con accesorios desbloqueables por puntos.
- [ ] Resumen animado de podio con confeti interactivo en canvas (`canvas-confetti`).

## 4. INTEGRACIONES Y EXPANSIÓN (BAJA PRIORIDAD)
- [ ] Generación automática de certificados de participación en PDF para estudiantes destacados.
- [ ] Posible conector futuro de solo lectura con aulas LMS estándar (sin alterar bases de datos de otros proyectos).
