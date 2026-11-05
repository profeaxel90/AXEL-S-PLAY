import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Database, Plus, Search, Filter, Download, Upload,
  Trash2, Edit3, CheckCircle2, AlertCircle, FileSpreadsheet,
  Layers, Tag
} from 'lucide-react';
import { SUBJECTS } from '../../types';
import type { QuestionType, Difficulty } from '../../types';

interface BankItem {
  id: string;
  content: string;
  type: QuestionType;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  correctAnswer: string;
  optionsCount: number;
}

const INITIAL_BANK: BankItem[] = [
  {
    id: 'qb-1',
    content: '¿Qué distancia mínima de seguimiento debe mantener un conductor en carretera a 80 km/h?',
    type: 'single_choice',
    subject: 'Educación Vial',
    topic: 'Distancias de Seguridad',
    difficulty: 'medium',
    correctAnswer: '30 metros (o regla de los 3 segundos)',
    optionsCount: 4,
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
  },
];

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<BankItem[]>(INITIAL_BANK);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Filtrado
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || q.subject === selectedSubject;
    const matchesDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesSubject && matchesDiff;
  });

  // Exportar a Excel real (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredQuestions.map((q) => ({
      ID: q.id,
      Pregunta: q.content,
      Tipo: q.type,
      Materia: q.subject,
      Tema: q.topic,
      Dificultad: q.difficulty,
      RespuestaCorrecta: q.correctAnswer,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BancoPreguntas');
    XLSX.writeFile(wb, 'AXEL_PLAY_Banco_Preguntas.xlsx');
  };

  // Descargar plantilla Excel para importar preguntas
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Pregunta: '¿Cuál es la velocidad máxima en zonas residenciales?',
        Tipo: 'single_choice',
        Materia: 'Educación Vial',
        Tema: 'Límites de Velocidad',
        Dificultad: 'easy',
        OpcionA: '30 km/h',
        OpcionB: '50 km/h',
        OpcionC: '60 km/h',
        OpcionD: '80 km/h',
        RespuestaCorrecta: 'A',
        Explicacion: 'En zonas escolares y residenciales la velocidad máxima es 30 km/h.',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Importacion');
    XLSX.writeFile(wb, 'Plantilla_Preguntas_AXEL_PLAY.xlsx');
  };

  // Manejador de importación de archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, string>[];

        const importedItems: BankItem[] = data.map((row, idx) => ({
          id: `imp-${Date.now()}-${idx}`,
          content: row['Pregunta'] || 'Pregunta importada',
          type: (row['Tipo'] as QuestionType) || 'single_choice',
          subject: row['Materia'] || 'General',
          topic: row['Tema'] || 'Importado',
          difficulty: (row['Dificultad'] as Difficulty) || 'medium',
          correctAnswer: row['RespuestaCorrecta'] || 'Opción A',
          optionsCount: 4,
        }));

        setQuestions((prev) => [...importedItems, ...prev]);
        setImportSuccess(`Se importaron ${importedItems.length} preguntas correctamente.`);
        setTimeout(() => {
          setImportSuccess(null);
          setImportModalOpen(false);
        }, 2000);
      } catch (err) {
        alert('Error al leer el archivo. Asegúrate de usar la plantilla.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta pregunta del banco?')) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Banco de Preguntas Reutilizable</h1>
          <p className="text-white/60 text-sm">Crea, organiza, clasifica e importa preguntas para tus actividades</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Importar Excel/CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-green-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card p-4 border-white/10 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por enunciado o tema..."
            className="input pl-11 py-2.5 text-sm"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="input py-2.5 px-3 text-sm bg-slate-900 border-white/10"
        >
          <option value="all">Todas las Materias</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="input py-2.5 px-3 text-sm bg-slate-900 border-white/10"
        >
          <option value="all">Todas las Dificultades</option>
          <option value="easy">Fácil</option>
          <option value="medium">Intermedio</option>
          <option value="hard">Difícil</option>
        </select>
      </div>

      {/* Table / List */}
      <div className="card p-0 border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-white/60 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Pregunta</th>
                <th className="py-3 px-4">Materia / Tema</th>
                <th className="py-3 px-4">Dificultad</th>
                <th className="py-3 px-4">Respuesta Correcta</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/90">
              {filteredQuestions.map((q) => (
                <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white max-w-md">
                    {q.content}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-purple-300">{q.subject}</div>
                    <div className="text-white/40 text-[11px]">{q.topic}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`badge ${
                      q.difficulty === 'easy' ? 'badge-success' :
                      q.difficulty === 'medium' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-green-300 font-medium">
                    {q.correctAnswer}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-red-500/10 text-red-400"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal de Importación ── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="card max-w-md w-full border-purple-500/30 p-6 shadow-2xl">
            <div className="text-center mb-5">
              <FileSpreadsheet className="w-12 h-12 text-purple-400 mx-auto mb-2" />
              <h3 className="text-xl font-black text-white">Importar Preguntas</h3>
              <p className="text-white/60 text-xs mt-1">
                Sube un archivo Excel (.xlsx) o CSV con tus preguntas tabuladas
              </p>
            </div>

            {importSuccess ? (
              <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-center text-xs font-semibold mb-4">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-400" />
                {importSuccess}
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-dashed border-purple-400 text-purple-300 hover:bg-purple-500/10"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Plantilla Oficial Excel</span>
                </button>

                <div className="p-4 rounded-2xl border-2 border-dashed border-white/20 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-file-upload"
                  />
                  <label htmlFor="excel-file-upload" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <span className="text-xs font-bold text-white block">Selecciona o arrastra tu archivo</span>
                    <span className="text-[10px] text-white/40 mt-1 block">Formatos admitidos: .xlsx, .csv</span>
                  </label>
                </div>
              </div>
            )}

            <button
              onClick={() => setImportModalOpen(false)}
              className="btn-secondary w-full py-2.5 rounded-xl text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
