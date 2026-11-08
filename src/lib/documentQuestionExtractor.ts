// ============================================================
// AXEL'S PLAY - Extractor Inteligente de Preguntas desde Documentos
// Soporta archivos .docx, .pdf, .txt y texto pegado directamente
// ============================================================

export interface ExtractedQuestion {
  id: string;
  content: string;
  type: 'multiple_choice' | 'true_false';
  timeLimit: number;
  points: number;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  explanation?: string;
}

/**
 * Extrae texto legible a partir de un archivo subido (.txt, .docx, .pdf)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'txt') {
    return await file.text();
  }

  // Para archivos .docx o .pdf en el navegador:
  // Intentamos leer el texto binario buscando bloques de texto imprimibles
  // o XML en caso de .docx
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (extension === 'docx') {
    // Los archivos .docx contienen 'word/document.xml' con tags <w:t>texto</w:t>
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(bytes);
    
    // Extraer todo lo que está dentro de etiquetas <w:t>...</w:t> o <w:t xml:space="preserve">...</w:t>
    const matches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (matches && matches.length > 0) {
      let extracted = '';
      for (const m of matches) {
        const text = m.replace(/<[^>]+>/g, '');
        extracted += text + ' ';
        if (text.endsWith('.') || text.endsWith('?') || text.endsWith(':')) {
          extracted += '\n';
        }
      }
      return extracted;
    }
  }

  // Fallback para PDF o binario: extraer secuencias de texto legibles (ASCII / UTF-8)
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(bytes);

  // Filtrar caracteres de control binarios y conservar líneas legibles
  const cleanLines = rawText
    .split(/[\r\n]+/)
    .map((line) => line.replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF¿?¡!.,;:()/%$#@+=_-]/g, ' ').trim())
    .filter((line) => line.length > 3 && !line.includes('stream') && !line.includes('endstream') && !line.includes('obj') && !line.includes('endobj'));

  return cleanLines.join('\n');
}

/**
 * Analiza texto libre e identifica preguntas con sus opciones A, B, C, D
 */
export function parseQuestionsFromText(text: string): ExtractedQuestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const questions: ExtractedQuestion[] = [];

  let currentQ: Partial<ExtractedQuestion> | null = null;
  let currentOptions: Array<{ id: string; text: string; isCorrect: boolean }> = [];

  // Expresiones regulares comunes de preguntas
  // 1. ¿Pregunta...? | 1) Pregunta | Pregunta 1: ...
  const questionHeaderRegex = /^(?:(?:\d+[\.\-\)]|\b(?:Pregunta|P|Q)\s*\d+[\:\.\-]?)\s*)(.+)$/i;
  // Opciones: A) ... | a. ... | 1. ... | - ...
  const optionRegex = /^(?:(?:[A-Da-d][\.\)\-\:]|\([A-Da-d]\))\s*)(.+)$/;
  // Indicador de respuesta correcta: "Respuesta: B" | "Correcta: A" | "R: C"
  const answerIndicatorRegex = /^(?:(?:Respuesta|Correcta|Rpta|Ans|Answer|Soluci[oó]n)[\:\s\-]+)([A-Da-d])/i;

  function finalizeCurrentQuestion() {
    if (!currentQ || !currentQ.content) return;

    // Asegurar al menos 2 opciones
    if (currentOptions.length < 2) {
      // Si no detectó opciones estándar, creamos Verdadero / Falso
      currentOptions = [
        { id: 'opt-a', text: 'Verdadero', isCorrect: true },
        { id: 'opt-b', text: 'Falso', isCorrect: false },
      ];
    }

    // Asegurar que haya al menos una correcta; si ninguna está marcada, marcar la primera
    if (!currentOptions.some((o) => o.isCorrect)) {
      currentOptions[0].isCorrect = true;
    }

    questions.push({
      id: `q-ext-${Date.now()}-${questions.length + 1}`,
      content: currentQ.content,
      type: currentOptions.length === 2 && currentOptions[0].text.toLowerCase().includes('verdadero') ? 'true_false' : 'multiple_choice',
      timeLimit: 20,
      points: 1000,
      options: currentOptions.slice(0, 4), // Máximo 4 opciones para Kahoot style
      explanation: currentQ.explanation,
    });

    currentQ = null;
    currentOptions = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. ¿Es un indicador de respuesta correcta explícito? (Ej: "Respuesta: B")
    const ansMatch = line.match(answerIndicatorRegex);
    if (ansMatch && currentOptions.length > 0) {
      const correctLetter = ansMatch[1].toUpperCase();
      const letterIndex = correctLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      currentOptions.forEach((opt, idx) => {
        opt.isCorrect = idx === letterIndex;
      });
      continue;
    }

    // 2. ¿Es una nueva pregunta?
    const qMatch = line.match(questionHeaderRegex);
    const isQuestionMark = line.startsWith('¿') || (line.endsWith('?') && line.length > 15);

    if (qMatch || (isQuestionMark && currentOptions.length >= 2)) {
      finalizeCurrentQuestion();
      currentQ = {
        content: qMatch ? qMatch[1].trim() : line,
      };
      continue;
    }

    // 3. ¿Es una opción (A, B, C, D)?
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQ) {
      let optText = optMatch[1].trim();
      let isCorrect = false;

      // Si tiene un asterisco al final o [x] indica respuesta correcta
      if (optText.includes('*') || optText.includes('(x)') || optText.includes('[x]')) {
        isCorrect = true;
        optText = optText.replace(/[\*\[\]\(\)]/g, '').trim();
      }

      currentOptions.push({
        id: `opt-${String.fromCharCode(97 + currentOptions.length)}`,
        text: optText,
        isCorrect,
      });
      continue;
    }

    // Si aún no hay opciones y ya tenemos pregunta, podría ser continuación de la pregunta
    if (currentQ && currentOptions.length === 0) {
      currentQ.content += ' ' + line;
    }
  }

  finalizeCurrentQuestion();

  // Si no se detectó con regex estricto pero hay texto, crear al menos una pregunta inteligente con el contenido
  if (questions.length === 0 && text.trim().length > 10) {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 15);
    paragraphs.slice(0, 5).forEach((p, idx) => {
      questions.push({
        id: `q-auto-${Date.now()}-${idx + 1}`,
        content: p.length > 120 ? p.slice(0, 120) + '...?' : p,
        type: 'multiple_choice',
        timeLimit: 20,
        points: 1000,
        options: [
          { id: 'opt-a', text: 'Opción Correcta', isCorrect: true },
          { id: 'opt-b', text: 'Opción Alternativa 1', isCorrect: false },
          { id: 'opt-c', text: 'Opción Alternativa 2', isCorrect: false },
          { id: 'opt-d', text: 'Opción Alternativa 3', isCorrect: false },
        ],
      });
    });
  }

  return questions;
}
