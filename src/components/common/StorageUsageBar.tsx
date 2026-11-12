import { useState, useEffect } from 'react';
import { HardDrive, Trash2, Sparkles, AlertTriangle, RefreshCw, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { calculateStorageMetrics, type StorageMetrics } from '../../lib/storageMonitor';
import { useHomeworkStore } from '../../stores/homeworkStore';

interface StorageUsageBarProps {
  onRefresh?: () => void;
  compact?: boolean;
}

export default function StorageUsageBar({ onRefresh, compact = false }: StorageUsageBarProps) {
  const [metrics, setMetrics] = useState<StorageMetrics>(() => calculateStorageMetrics());
  const [showCleanupMenu, setShowCleanupMenu] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const { cleanStoragePhotos, clearClosedAssignments } = useHomeworkStore();

  const updateMetrics = () => {
    setMetrics(calculateStorageMetrics());
    if (onRefresh) onRefresh();
  };

  useEffect(() => {
    updateMetrics();
  }, []);

  const handleCleanPhotos = () => {
    const cleaned = cleanStoragePhotos();
    updateMetrics();
    setShowCleanupMenu(false);
    setFeedbackMsg(`¡Limpieza exitosa! Se liberaron fotos de evidencias en ${cleaned} entregas.`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleCleanClosed = () => {
    const removed = clearClosedAssignments();
    updateMetrics();
    setShowCleanupMenu(false);
    setFeedbackMsg(`¡Se eliminaron ${removed} asignaciones cerradas.`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const statusColors = {
    optimal: {
      bar: 'from-emerald-500 to-teal-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      label: 'Estado Óptimo',
    },
    moderate: {
      bar: 'from-yellow-500 to-amber-400',
      badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      label: 'Capacidad Moderada',
    },
    critical: {
      bar: 'from-red-500 to-rose-400',
      badge: 'bg-red-500/20 text-red-300 border-red-500/40',
      label: '¡Atención! Memoria Alta',
    },
  }[metrics.status];

  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Notificación de feedback */}
      {feedbackMsg && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Capacidad de Memoria de AXEL'S PLAY
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColors.badge}`}>
                {statusColors.label}
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Espacio en el navegador para actividades, fotos de cuadernos y resultados
            </p>
          </div>
        </div>

        {/* Acciones de Limpieza */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={updateMetrics}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Actualizar medición"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowCleanupMenu(!showCleanupMenu)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Hacer Limpieza</span>
          </button>
        </div>
      </div>

      {/* Menú de opciones de limpieza */}
      {showCleanupMenu && (
        <div className="mb-3 p-3 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2 animate-fade-in text-xs">
          <span className="font-bold text-purple-300 block mb-1">🧹 Opciones de Mantenimiento Preventivo:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCleanPhotos}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-start gap-2 hover:border-purple-400/50 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Liberar Fotos de Cuadernos</p>
                <p className="text-[10px] text-white/50">Limpia las imágenes pesadas de evidencias guardando las notas numéricas.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleCleanClosed}
              className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-start gap-2 hover:border-red-400/50 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Eliminar Asignaciones Cerradas</p>
                <p className="text-[10px] text-white/50">Elimina tareas de bimestres anteriores que ya cerraste.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Barra de progreso de almacenamiento */}
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${statusColors.bar} transition-all duration-700 shadow-sm`}
          style={{ width: `${Math.max(3, metrics.percentage)}%` }}
        />
      </div>

      {/* Metadatos numéricos */}
      <div className="flex items-center justify-between text-[11px] font-bold text-white/60 mt-2">
        <span>
          Usado: <strong className="text-white font-black">{metrics.usedFormatted}</strong> de {metrics.totalFormatted} ({metrics.percentage}%)
        </span>
        {metrics.details.photosCount > 0 && (
          <span className="text-emerald-400 font-semibold">
            📸 {metrics.details.photosCount} fotos en memoria (~{Math.round(metrics.details.photosBytes / 1024)} KB)
          </span>
        )}
      </div>
    </div>
  );
}
