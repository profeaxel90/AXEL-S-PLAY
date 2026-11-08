// ============================================================
// AXEL'S PLAY - Modal Selector de Preguntas del Banco
// Permite importar preguntas del banco al editor de juegos
// ============================================================
import { useState } from 'react';
import { X, Database, CheckCircle2, Search } from 'lucide-react';
import { INITIAL_BANK, type BankItem } from '../../data/questionBank';

interface QuestionBankPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: BankItem[]) => void;
}

export default function QuestionBankPickerModal({
  isOpen,
  onClose,
  onImport,
}: QuestionBankPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Cargar desde sessionStorage si hay preguntas guardadas, si no usar INITIAL_BANK
  let bank: BankItem[] = INITIAL_BANK;
  try {
    const stored = sessionStorage.getItem('question_bank');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        bank = parsed;
      }
    }
  } catch {
    // usa INITIAL_BANK como fallback
  }

  const filtered = bank.filter(
    (q) =>
      q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((q) => q.id)));
    }
  };

  const handleImport = () => {
    const toImport = bank.filter((q) => selected.has(q.id));
    onImport(toImport);
    setSelected(new Set());
    onClose();
  };

  const difficultyBadge: Record<string, string> = {
    easy: 'badge-success',
    medium: 'badge-warning',
    hard: 'badge-danger',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-bounce-in">
      <div
        className="card max-w-2xl w-full border-purple-500/40 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-black text-white">📚 Banco de Preguntas</h3>
            <span className="text-xs text-white/50">({bank.length} disponibles)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por pregunta, tema o materia..."
            className="input pl-9 py-2 text-sm"
          />
        </div>

        {/* Select all */}
        <div className="flex items-center justify-between text-xs text-white/60">
          <button
            onClick={handleSelectAll}
            className="text-purple-300 hover:text-purple-200 font-semibold hover:underline"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? '☐ Deseleccionar todas'
              : '☑ Seleccionar todas'}
          </button>
          {selected.size > 0 && (
            <span className="text-yellow-300 font-black">
              {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Question list */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">
              No se encontraron preguntas con ese criterio.
            </p>
          ) : (
            filtered.map((q) => {
              const isSelected = selected.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-600/20 shadow-md shadow-purple-600/20'
                      : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  {/* Checkbox visual */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-white/30 bg-transparent'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug mb-1">
                      {q.content}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-purple-300 font-semibold">{q.subject}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-[10px] text-white/50">{q.topic}</span>
                      <span
                        className={`badge text-[10px] ${difficultyBadge[q.difficulty] || 'badge-primary'}`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                    {/* Respuesta correcta con ícono ✅ */}
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-green-300">
                      <span>✅</span>
                      <span className="font-medium">{q.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-2.5 border-t border-white/10 pt-3">
          <button
            onClick={onClose}
            className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className={`py-2.5 px-5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              selected.size > 0
                ? 'btn-primary shadow-lg shadow-purple-600/30 hover:scale-105'
                : 'bg-white/10 text-white/30 border border-white/10 cursor-not-allowed'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>
              Añadir seleccionadas ({selected.size})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
