import { useState } from 'react';
import {
  FileText, Upload, X, CheckCircle2, AlertCircle, Sparkles,
  Layers, Copy, HelpCircle, FileCheck
} from 'lucide-react';
import {
  extractTextFromFile, parseQuestionsFromText, type ExtractedQuestion
} from '../../lib/documentQuestionExtractor';

interface DocumentQuestionImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: ExtractedQuestion[]) => void;
}

export default function DocumentQuestionImporterModal({
  isOpen,
  onClose,
  onImport,
}: DocumentQuestionImporterModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<ExtractedQuestion[]>([]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsLoading(true);
    setFileName(file.name);

    try {
      const extractedText = await extractTextFromFile(file);
      if (!extractedText || extractedText.trim().length < 5) {
        throw new Error('No se pudo extraer texto legible del documento. Si es un PDF escaneado (imagen), puedes copiar y pegar el texto en la pestaña "Pegar Texto".');
      }

      const parsed = parseQuestionsFromText(extractedText);
      if (parsed.length === 0) {
        throw new Error('No se encontraron preguntas con formato reconocible. Asegúrate de que las opciones tengan formato A), B), C), D).');
      }

      setPreviewQuestions(parsed);
      setPastedText(extractedText);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Por favor escribe o pega el texto de tu cuestionario.');
      return;
    }

    setErrorMsg(null);
    const parsed = parseQuestionsFromText(pastedText);
    if (parsed.length === 0) {
      setErrorMsg('No se detectaron preguntas en el texto. Revisa que sigan un formato como: 1. ¿Pregunta? A) Opción B) Opción');
      return;
    }
    setPreviewQuestions(parsed);
  };

  const handleConfirmImport = () => {
    if (previewQuestions.length === 0) return;
    onImport(previewQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="card max-w-2xl w-full p-6 border-purple-500/40 bg-slate-900 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Importar Preguntas desde Word o PDF</h2>
              <p className="text-xs text-white/60">
                Sube tu documento (.docx, .pdf, .txt) y el sistema extraerá las preguntas automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Subir Archivo vs Pegar Texto */}
        <div className="flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Subir Documento (.docx / .pdf / .txt)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'paste'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Pegar Texto de Examen</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-purple-500/40 rounded-2xl bg-purple-900/10 hover:bg-purple-900/20 cursor-pointer transition-all">
                <input
                  type="file"
                  accept=".docx,.pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="text-center p-4">
                  {isLoading ? (
                    <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  ) : (
                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce" />
                  )}
                  <p className="text-sm font-bold text-white">
                    {fileName ? `Archivo: ${fileName}` : 'Haz clic o arrastra tu archivo aquí'}
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    Formatos compatibles: Microsoft Word (.docx), Adobe PDF (.pdf) y Texto plano (.txt)
                  </p>
                </div>
              </label>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-white/60 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Formato sugerido para tus documentos:</span>
                </p>
                <p>1. ¿Pregunta o enunciado?</p>
                <p>A) Opción 1 &nbsp; B) Opción 2 &nbsp; C) Opción 3 &nbsp; D) Opción 4</p>
                <p>Respuesta: B (o marca la correcta con un asterisco *)</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`1. ¿Cuál es la distancia mínima de seguridad entre vehículos?&#10;A) 10 metros&#10;B) 30 metros *&#10;C) 5 metros&#10;D) 50 metros&#10;Respuesta: B&#10;&#10;2. Las señales reglamentarias tienen forma circular y borde rojo.&#10;A) Verdadero *&#10;B) Falso`}
                rows={7}
                className="input w-full font-mono text-xs p-3 leading-relaxed"
              />
              <button
                type="button"
                onClick={handleParsePasted}
                className="btn-secondary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Analizar y Extraer Preguntas</span>
              </button>
            </div>
          )}

          {/* Preguntas Extraídas (Preview) */}
          {previewQuestions.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-green-400 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  <span>{previewQuestions.length} Pregunta(s) Extraída(s) con Éxito</span>
                </span>
                <span className="text-[10px] text-white/50">Listas para incorporarse a tu juego</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {previewQuestions.map((q, qIdx) => (
                  <div key={q.id} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                    <p className="font-bold text-white">
                      {qIdx + 1}. {q.content}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-1.5 rounded-lg border text-[11px] truncate flex items-center justify-between ${
                            opt.isCorrect
                              ? 'bg-green-500/20 border-green-500/50 text-green-300 font-bold'
                              : 'bg-white/5 border-white/10 text-white/70'
                          }`}
                        >
                          <span className="truncate">{opt.text}</span>
                          {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 ml-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={previewQuestions.length === 0}
            onClick={handleConfirmImport}
            className={`btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg ${
              previewQuestions.length > 0 ? 'shadow-purple-600/30' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Agregar {previewQuestions.length} Preguntas al Juego</span>
          </button>
        </div>
      </div>
    </div>
  );
}
