import type { HomeworkAssignment, HomeworkQuestion } from '../types/homework';

interface CompactQuestion {
  i: string;
  c: string;
  img?: string;
  vid?: string;
  ac?: boolean;
  at?: boolean;
  ap?: boolean;
  opts?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  exp?: string;
}

interface CompactAssignment {
  id: string;
  pin: string;
  t: string;
  d?: string;
  g?: string;
  gid?: string;
  at?: 'quiz' | 'pdf_guide' | 'exam_review';
  pdf?: string;
  pdfN?: string;
  mc?: number;
  dueD?: string;
  dueT?: string;
  qs?: CompactQuestion[];
}

/**
 * Empaqueta una Asignación en un string compacto para incluir en la URL del código QR.
 * Permite que cualquier celular que escanee el QR abra y juegue la asignación inmediatamente,
 * incluso si fue creada en otra computadora y el celular no comparte localStorage ni backend.
 */
export function encodeAssignmentPayload(assignment: HomeworkAssignment): string {
  try {
    const compact: CompactAssignment = {
      id: assignment.id,
      pin: assignment.pin,
      t: assignment.title,
      d: assignment.description,
      g: assignment.gradeGroupTarget,
      gid: assignment.groupId,
      at: assignment.assignmentType,
      pdf: assignment.pdfUrl,
      pdfN: assignment.pdfName,
      mc: assignment.maxCorrections,
      dueD: assignment.dueDate,
      dueT: assignment.dueTime,
      qs: (assignment.customQuestions || []).map((q) => ({
        i: q.id,
        c: q.content,
        img: q.imageUrl,
        vid: q.videoUrl,
        ac: q.allowChoice,
        at: q.allowTextResponse,
        ap: q.allowPhotoUpload,
        opts: q.options?.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        exp: q.explanation,
      })),
    };

    const jsonStr = JSON.stringify(compact);
    // Codificación segura Base64 URL-friendly
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return base64;
  } catch (e) {
    console.warn('Error encoding assignment payload:', e);
    return '';
  }
}

/**
 * Desempaqueta la carga útil de la URL y la convierte en un objeto HomeworkAssignment completo.
 */
export function decodeAssignmentPayload(encoded: string): HomeworkAssignment | null {
  try {
    // Restaurar padding de Base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const c: CompactAssignment = JSON.parse(jsonStr);

    if (!c.id || !c.pin || !c.t) return null;

    const questions: HomeworkQuestion[] = (c.qs || []).map((q) => ({
      id: q.i,
      content: q.c,
      imageUrl: q.img,
      videoUrl: q.vid,
      allowChoice: q.ac,
      allowTextResponse: q.at,
      allowPhotoUpload: q.ap,
      options: q.opts?.map((o) => ({ id: o.id, text: o.text, isCorrect: Boolean(o.isCorrect) })),
      explanation: q.exp,
    }));

    const assignment: HomeworkAssignment = {
      id: c.id,
      pin: c.pin,
      title: c.t,
      description: c.d || 'Lee con atención y responde la actividad.',
      gradeGroupTarget: c.g || 'General',
      groupId: c.gid,
      gameId: 'custom-homework',
      dueDate: c.dueD,
      dueTime: c.dueT,
      maxCorrections: c.mc || 3,
      status: 'active',
      createdAt: new Date().toISOString(),
      submissions: [],
      assignmentType: c.at || 'quiz',
      pdfUrl: c.pdf,
      pdfName: c.pdfN,
      allowPhotoUpload: true,
      allowRetries: c.at === 'exam_review',
      customQuestions: questions.length > 0 ? questions : undefined,
    };

    return assignment;
  } catch (e) {
    console.warn('Error decoding assignment payload:', e);
    return null;
  }
}
