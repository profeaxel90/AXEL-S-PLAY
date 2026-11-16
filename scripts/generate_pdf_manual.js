// ============================================================
// Generador Profesional de Manual en PDF para AXEL'S PLAY
// Utiliza jsPDF y jspdf-autotable
// ============================================================
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

async function generateManualPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Helper para verificar salto de página
  function checkPageBreak(requiredSpace = 20) {
    if (y + requiredSpace > pageHeight - 20) {
      doc.addPage();
      y = 20;
      drawPageHeader();
    }
  }

  // Header superior para páginas 2 en adelante
  function drawPageHeader() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text("AXEL'S PLAY — Manual Maestro de Copia, Migración y Ejecución", margin, 12);
    doc.setDrawColor(220, 225, 235);
    doc.line(margin, 14, pageWidth - margin, 14);
  }

  // ── PORTADA / ENCABEZADO PRINCIPAL (PÁGINA 1) ──
  // Caja de cabecera con degradado simulado
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 36, 4, 4, 'F');

  // Decoración púrpura
  doc.setFillColor(124, 58, 237); // purple-600
  doc.rect(margin, y, 4, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("MANUAL MAESTRO DE COPIA Y MIGRACIÓN", margin + 8, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(192, 132, 252); // purple-300
  doc.text("AXEL'S PLAY — Plataforma Educativa Interactiva para Docentes", margin + 8, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Versión 2.5 • Autor: Profe Axel • Compatible con Google Antigravity, Cursor y VS Code", margin + 8, y + 29);

  y += 44;

  // Helper para títulos de sección
  function drawSectionTitle(number, title) {
    checkPageBreak(25);
    doc.setFillColor(243, 232, 255); // purple-100
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFillColor(124, 58, 237);
    doc.rect(margin, y, 3, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(88, 28, 135); // purple-900
    doc.text(`${number}. ${title.toUpperCase()}`, margin + 6, y + 5.5);
    y += 12;
  }

  // Helper para párrafos
  function drawParagraph(text) {
    checkPageBreak(12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // slate-700
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.8 + 2;
  }

  // Helper para cajas de código / comandos
  function drawCodeBox(linesArray) {
    const boxHeight = linesArray.length * 4.5 + 6;
    checkPageBreak(boxHeight + 4);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    let lineY = y + 5;
    for (const line of linesArray) {
      doc.text(line, margin + 4, lineY);
      lineY += 4.5;
    }
    y += boxHeight + 4;
  }

  // Helper para cajas de notas / alertas
  function drawNoteBox(title, text, type = 'info') {
    const textLines = doc.splitTextToSize(text, contentWidth - 10);
    const boxHeight = textLines.length * 4.5 + 10;
    checkPageBreak(boxHeight + 4);

    let bgColor = [238, 242, 255]; // indigo-50
    let borderColor = [99, 102, 241];
    let titleColor = [49, 46, 129];

    if (type === 'tip') {
      bgColor = [236, 253, 245]; // emerald-50
      borderColor = [16, 185, 129];
      titleColor = [6, 95, 70];
    } else if (type === 'warning') {
      bgColor = [254, 243, 199]; // amber-50
      borderColor = [245, 158, 11];
      titleColor = [146, 64, 14];
    }

    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.text(title, margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(textLines, margin + 4, y + 10);

    y += boxHeight + 4;
  }

  // ── SECCIÓN 1: ARQUITECTURA TÉCNICA ──
  drawSectionTitle('1', 'Arquitectura Técnica del Proyecto');
  drawParagraph("AXEL'S PLAY es una aplicación web moderna de alta velocidad diseñada para aulas de clase y sesiones en vivo. No requiere servidores dedicados complejos ni bases de datos SQL pesadas en local, gracias a su arquitectura distribuida:");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Componente', 'Tecnología', 'Propósito y Función']],
    body: [
      ['Frontend', 'React 18 + TypeScript', 'Interfaz interactiva de Docentes y Estudiantes con tipado estricto.'],
      ['Empaquetador', 'Vite 8 (Rolldown/ESBuild)', 'Compilación ultrarrápida y recarga instantánea en desarrollo (HMR).'],
      ['Estilos & UI', 'Tailwind CSS + Lucide Icons', 'Estética arcade oscura, responsiva para móviles y proyectores.'],
      ['Estado Global', 'Zustand Stores', 'Gestión síncrona de datos en memoria (juegos, tareas, historial).'],
      ['Almacenamiento', 'localStorage + IndexedDB', 'Guarda miles de tareas, fotos de cuadernos y audios (1,000 MB+).'],
      ['Tiempo Real', 'MQTT WSS + Supabase Realtime', 'Sincronización simultánea de preguntas y respuestas en celulares.'],
      ['Audio', 'Web Audio API + HTML5 Audio', 'Música procedural sin archivos y reproductor de temas propios.'],
      ['Hosting Web', 'Vercel / GitHub Integration', 'Despliegue continuo en https://axel-s-play.vercel.app.'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── SECCIÓN 2: REQUISITOS PREVIOS ──
  drawSectionTitle('2', 'Requisitos Previos en el Nuevo Computador');
  drawParagraph("Para instalar y correr este proyecto en cualquier computador con Windows, macOS o Linux, solo necesitas dos programas gratuitos instalados:");

  drawParagraph("1. Node.js (LTS): Descarga la versión 18.x o 20.x+ desde https://nodejs.org/\n2. Git: Control de versiones oficial desde https://git-scm.com/ o instala GitHub Desktop.\n3. Entorno de Codificación: Google Antigravity (Recomendado), Cursor o Visual Studio Code.");

  drawCodeBox([
    "# Verifica tus instalaciones abriendo PowerShell o Terminal:",
    "node -v      # Debe responder v18.x.x o v20.x.x o superior",
    "npm -v       # Debe responder v9.x.x o v10.x.x",
    "git --version",
  ]);

  // ── SECCIÓN 3: PASO A PASO PARA CLONAR Y CORRER ──
  drawSectionTitle('3', 'Paso a Paso: Clonar y Ejecutar el Proyecto');
  drawParagraph("Elige una de las dos opciones para llevar el código al nuevo computador:");

  drawParagraph("OPCIÓN A: Desde GitHub (Recomendado y más rápido)");
  drawCodeBox([
    "# 1. Abre tu terminal y ve a tu carpeta de proyectos:",
    "cd C:\\Users\\TU_USUARIO\\OneDrive\\Documentos\\GitHub",
    "",
    "# 2. Clona el repositorio oficial de AXEL'S PLAY:",
    "git clone https://github.com/profeaxel90/AXEL-S-PLAY.git",
    "",
    "# 3. Entra a la carpeta clonada:",
    "cd AXEL-S-PLAY",
    "",
    "# 4. Instala todas las dependencias requeridas (solo toma 15 segundos):",
    "npm install",
    "",
    "# 5. Inicia el servidor de desarrollo local:",
    "npm run dev",
  ]);

  drawNoteBox(
    'OPCIÓN B: COPIA FÍSICA EN MEMORIA USB O DISCO EXTERNO',
    'Si llevas el proyecto en una memoria USB, NUNCA copies las carpetas "node_modules" ni "dist". Esas carpetas contienen decenas de miles de archivos pequeños que demoran la copia. Sin ellas, el proyecto pesa apenas entre 10 y 25 MB. En el nuevo equipo solo pegas la carpeta y ejecutas "npm install" para regenerarlas en segundos.',
    'tip'
  );

  // ── SECCIÓN 4: CÓMO CORRER EN GOOGLE ANTIGRAVITY ──
  drawSectionTitle('4', 'Cómo Correr el Proyecto en Google Antigravity');
  drawParagraph("1. Abre Google Antigravity en tu nuevo computador.\n2. Haz clic en Archivo (File) > Abrir Carpeta (Open Folder).\n3. Selecciona la carpeta 'AXEL-S-PLAY'.\n4. Antigravity detectará automáticamente las herramientas de Vite, React y TypeScript.\n5. Abre la terminal integrada de Antigravity (Ctrl + `) y ejecuta 'npm run dev'.\n6. Podrás usar el navegador web integrado y los agentes autónomos de Antigravity para seguir mejorando la aplicación.");

  // ── SECCIÓN 5: MIGRACIÓN A OTRAS PLATAFORMAS ──
  drawSectionTitle('5', 'Migración a Otras Plataformas (Cursor, VS Code, Nube)');
  drawParagraph("• En Cursor o Visual Studio Code: Abre la carpeta, ejecuta 'npm install' y 'npm run dev'. Extensiones recomendadas: Tailwind CSS IntelliSense, ESLint y Prettier.\n• En Vercel: Conecta tu repositorio de GitHub https://github.com/profeaxel90/AXEL-S-PLAY. Vercel detecta automáticamente Vite, ejecuta 'npm run build' y entrega en la carpeta 'dist' con soporte SPA mediante 'vercel.json'.\n• En Netlify / Cloudflare Pages: Comando de build: 'npm run build', Carpeta de publicación: 'dist'.");

  // ── SECCIÓN 6: MIGRACIÓN DE DATOS Y JUEGOS CON BACKUP ──
  drawSectionTitle('6', 'Migración Completa de Datos (Juegos, Tareas y Fotos)');
  drawParagraph("El código fuente descargado de Git no incluye tus juegos personalizados ni las fotos de cuadernos de los alumnos porque se almacenan en el navegador. Para pasarlos al nuevo equipo en 1 segundo:");

  drawParagraph("PASO 1 (En el computador original):");
  drawParagraph("1. Inicia sesión como Docente / Super Admin en AXEL'S PLAY.\n2. Ve a Configuración (/teacher/settings).\n3. En la sección 'Copia de Seguridad y Respaldo Completo', haz clic en 'Descargar Respaldo Total (.json)'.\n4. Se descargará un archivo como axels_play_backup_2026-11-15.json que incluye todos tus juegos, preguntas, notas de tareas y fotos de IndexedDB.");

  drawParagraph("PASO 2 (En el nuevo computador):");
  drawParagraph("1. Abre AXEL'S PLAY (en local http://localhost:5173 o en la web).\n2. Ve a Configuración (/teacher/settings).\n3. En 'Copia de Seguridad', haz clic en 'Seleccionar Archivo de Respaldo (.json)' y elige tu archivo.\n4. Verifica el resumen y haz clic en 'Confirmar y Restaurar'.\n5. ¡Listo! Todos tus juegos, preguntas y fotos quedan clonados de forma idéntica.");

  // ── SECCIÓN 7: COMANDOS ÚTILES ──
  drawSectionTitle('7', 'Comandos Útiles de la Plataforma');

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Comando', 'Descripción']],
    body: [
      ['npm run dev', 'Inicia el servidor local de desarrollo en http://localhost:5173.'],
      ['npm run build', 'Compila y optimiza todo el código para producción en la carpeta dist/.'],
      ['npm run preview', 'Previsualiza localmente el build compilado idéntico a producción.'],
      ['git status', 'Muestra los archivos que has modificado.'],
      ['git push origin main', 'Sube tus cambios a GitHub y despliega automáticamente en Vercel.'],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── SECCIÓN 8: SOLUCIÓN DE PROBLEMAS FRECUENTES ──
  drawSectionTitle('8', 'Solución de Problemas Frecuentes');
  drawParagraph("• Error 'Port 5173 is in use': Vite usará automáticamente el puerto 5174. Si deseas cerrar el proceso anterior en Windows PowerShell, ejecuta: Stop-Process -Name node -Force\n• Error de Audio Autoplay: Los navegadores como Chrome y Edge impiden que la música empiece antes de que el usuario haga clic. AXEL'S PLAY incluye desbloqueo automático con el primer clic del docente.\n• Despliegue en Vivo: Recuerda que la versión oficial siempre está disponible en línea para tus clases en https://axel-s-play.vercel.app.");

  // ── PIE DE PÁGINA EN TODAS LAS PÁGINAS ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(
      `AXEL'S PLAY • Manual de Copia y Migración • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    doc.setDrawColor(220, 225, 235);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  }

  // Guardar archivo en las ubicaciones requeridas
  const buffer = Buffer.from(doc.output('arraybuffer'));

  const publicPath = path.join(process.cwd(), 'public', 'manuales', 'MANUAL_MIGRACION_AXELS_PLAY.pdf');
  const rootPath = path.join(process.cwd(), 'MANUAL_MIGRACION_AXELS_PLAY.pdf');
  const brainPath = 'C:\\Users\\axell\\.gemini\\antigravity\\brain\\4898fdf7-71c6-480d-a17e-422465f35812\\MANUAL_MIGRACION_AXELS_PLAY.pdf';

  fs.writeFileSync(publicPath, buffer);
  fs.writeFileSync(rootPath, buffer);
  try {
    fs.writeFileSync(brainPath, buffer);
  } catch (e) {
    console.warn('Could not write to brain path:', e.message);
  }

  console.log('PDF generado exitosamente:');
  console.log('- Public:', publicPath);
  console.log('- Root:', rootPath);
  console.log('- Brain:', brainPath);
}

generateManualPDF().catch(err => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});
