// ============================================================
// AXEL'S PLAY - Banco de Preguntas Compartido
// Exportado para uso en QuestionBankPage y GameEditorPage
// ============================================================
import type { QuestionType, Difficulty } from '../types';

export interface BankItem {
  id: string;
  content: string;
  type: QuestionType;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  correctAnswer: string;
  optionsCount: number;
  options?: Array<{ text: string; isCorrect: boolean }>;
}

export const INITIAL_BANK: BankItem[] = [
  {
    id: 'qb-1',
    content: '¿Qué distancia mínima de seguimiento debe mantener un conductor en carretera a 80 km/h?',
    type: 'single_choice',
    subject: 'Educación Vial',
    topic: 'Distancias de Seguridad',
    difficulty: 'medium',
    correctAnswer: '30 metros (o regla de los 3 segundos)',
    optionsCount: 4,
    options: [
      { text: '30 metros (o regla de los 3 segundos)', isCorrect: true },
      { text: '10 metros', isCorrect: false },
      { text: '50 metros', isCorrect: false },
      { text: '5 metros', isCorrect: false },
    ],
  },
  {
    id: 'qb-2',
    content: '¿Cuál es el gas más abundante en la atmósfera terrestre?',
    type: 'single_choice',
    subject: 'Ciencias Naturales',
    topic: 'Atmósfera',
    difficulty: 'easy',
    correctAnswer: 'Nitrógeno (78%)',
    optionsCount: 4,
    options: [
      { text: 'Nitrógeno (78%)', isCorrect: true },
      { text: 'Oxígeno (21%)', isCorrect: false },
      { text: 'Dióxido de carbono', isCorrect: false },
      { text: 'Argón', isCorrect: false },
    ],
  },
  {
    id: 'qb-3',
    content: 'En un triángulo rectángulo, ¿cómo se denomina el lado opuesto al ángulo recto?',
    type: 'single_choice',
    subject: 'Matemáticas',
    topic: 'Geometría',
    difficulty: 'easy',
    correctAnswer: 'Hipotenusa',
    optionsCount: 4,
    options: [
      { text: 'Hipotenusa', isCorrect: true },
      { text: 'Cateto adyacente', isCorrect: false },
      { text: 'Cateto opuesto', isCorrect: false },
      { text: 'Diagonal', isCorrect: false },
    ],
  },
  {
    id: 'qb-4',
    content: 'Es obligatorio portar el botiquín de primeros auxilios y extintor en el vehículo.',
    type: 'true_false',
    subject: 'Educación Vial',
    topic: 'Equipo de Prevención',
    difficulty: 'easy',
    correctAnswer: 'Verdadero',
    optionsCount: 2,
    options: [
      { text: 'Verdadero', isCorrect: true },
      { text: 'Falso', isCorrect: false },
    ],
  },
  {
    id: 'qb-5',
    content: '¿Cuál de los siguientes no es un derecho fundamental consignado en la Constitución?',
    type: 'single_choice',
    subject: 'Formación Ciudadana',
    topic: 'Derechos Humanos',
    difficulty: 'hard',
    correctAnswer: 'Derecho a circular sin documentos de identificación',
    optionsCount: 4,
    options: [
      { text: 'Derecho a circular sin documentos de identificación', isCorrect: true },
      { text: 'Derecho a la vida', isCorrect: false },
      { text: 'Derecho a la educación', isCorrect: false },
      { text: 'Derecho a la salud', isCorrect: false },
    ],
  },
];
