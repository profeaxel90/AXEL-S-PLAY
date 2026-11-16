import { useState, useEffect } from 'react';
import {
  audioEngine,
  SOUND_SLOTS,
  type SoundSlot,
  type CustomSoundItem,
} from '../../lib/audio';
import { useAuthStore, type StoredAccount } from '../../stores/authStore';
import { useHomeworkStore } from '../../stores/homeworkStore';
import { useSessionHistoryStore } from '../../stores/sessionHistoryStore';
import StorageUsageBar from '../../components/common/StorageUsageBar';
import {
  Volume2, VolumeX, Music, Sliders, CheckCircle2,
  Sparkles, Play, Pause, Upload, ShieldCheck, Zap,
  UserPlus, Trash2, Shield, RotateCcw, AlertTriangle, X,
  Clock, Repeat, RefreshCw, AudioWaveform, Headphones, FileAudio, Check, Info
} from 'lucide-react';

export default function SettingsPage() {
  const currentSettings = audioEngine.getSettings();
  const { getAllTeachers, createTeacher, deleteTeacher } = useAuthStore();
  const { clearAllHomeworkData } = useHomeworkStore();

  const [musicEnabled, setMusicEnabled] = useState(currentSettings.musicEnabled ?? true);
  const [applyToAllGames, setApplyToAllGames] = useState(currentSettings.applyToAllGames ?? true);
  const [musicVolume, setMusicVolume] = useState(currentSettings.musicVolume ?? 0.75);
  const [effectsVolume, setEffectsVolume] = useState(currentSettings.effectsVolume ?? 0.85);
  const [effectsEnabled, setEffectsEnabled] = useState(currentSettings.effectsEnabled ?? true);

  // Estados del Gestor de Música de Super Admin
  const [customSounds, setCustomSounds] = useState<Record<string, CustomSoundItem>>({});
  const [previewingSlotId, setPreviewingSlotId] = useState<string | null>(null);
  const [soundSaveSuccess, setSoundSaveSuccess] = useState<string>('');
  const [showResetAllSoundsModal, setShowResetAllSoundsModal] = useState<boolean>(false);
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null);

  // Estados de Super Admin para Docentes
  const [teachersList, setTeachersList] = useState<StoredAccount[]>(() => getAllTeachers());
  const [showNewTeacherModal, setShowNewTeacherModal] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherSchool, setNewTeacherSchool] = useState('');
  const [teacherActionError, setTeacherActionError] = useState('');
  const [teacherActionSuccess, setTeacherActionSuccess] = useState('');

  // Estado para confirmación de reseteo de estadísticas
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    // Sincronizar sonidos personalizados al montar
    audioEngine.loadCustomSounds().then(() => {
      setCustomSounds(audioEngine.getAllCustomSounds());
    });

    const handleSoundsUpdated = () => {
      setCustomSounds(audioEngine.getAllCustomSounds());
    };

    window.addEventListener('axels_play_sounds_updated', handleSoundsUpdated);
    return () => {
      window.removeEventListener('axels_play_sounds_updated', handleSoundsUpdated);
      audioEngine.stopPreview();
    };
  }, []);

  const refreshTeachers = () => {
    setTeachersList(getAllTeachers());
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherActionError('');
    setTeacherActionSuccess('');
    try {
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPassword.trim()) {
        setTeacherActionError('Por favor completa todos los campos requeridos.');
        return;
      }
      createTeacher({
        fullName: newTeacherName.trim(),
        email: newTeacherEmail.trim(),
        password: newTeacherPassword.trim(),
        school: newTeacherSchool.trim() || 'Colegio Experimental AXEL',
        role: 'teacher',
      });
      setTeacherActionSuccess(`Docente ${newTeacherName} creado con éxito.`);
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPassword('');
      setNewTeacherSchool('');
      setShowNewTeacherModal(false);
      refreshTeachers();
      setTimeout(() => setTeacherActionSuccess(''), 4000);
    } catch (err: any) {
      setTeacherActionError(err.message || 'Error al crear docente.');
    }
  };

  const handleDeleteTeacher = (email: string) => {
    if (email.toLowerCase().includes('profe@axelsplay.edu') || email.toLowerCase().includes('profe@axelplay.edu')) {
      alert('No puedes eliminar la cuenta principal de Super Admin del Profe Axel.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar al docente ${email}?`)) {
      deleteTeacher(email);
      refreshTeachers();
      setTeacherActionSuccess('Docente eliminado correctamente.');
      setTimeout(() => setTeacherActionSuccess(''), 3000);
    }
  };

  const handleExecuteResetStats = () => {
    try {
      useSessionHistoryStore.getState().clearHistory();
      localStorage.removeItem('axels_play_session_history');
      localStorage.removeItem('axelplay_session_history');
      localStorage.removeItem('axels_play_recent_sessions');
      clearAllHomeworkData();
      setShowResetModal(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (e) {
      console.warn('Error resetting stats:', e);
    }
  };

  // ── Manejo de Preescucha de Sonidos ──
  const handleTogglePreview = (slotId: string) => {
    if (previewingSlotId === slotId) {
      audioEngine.stopPreview();
      setPreviewingSlotId(null);
    } else {
      setPreviewingSlotId(slotId);
      audioEngine.playPreview(slotId, () => {
        setPreviewingSlotId((curr) => (curr === slotId ? null : curr));
      });
    }
  };

  // ── Cargar Audio Personalizado para una Ranura Específica ──
  const handleUploadSoundSlot = (slot: SoundSlot, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingSlotId(slot.id);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        await audioEngine.saveCustomSound(slot.id, dataUrl, file.name);
        setCustomSounds(audioEngine.getAllCustomSounds());
        setSoundSaveSuccess(`Sonido para "${slot.name}" cargado exitosamente.`);
        setTimeout(() => setSoundSaveSuccess(''), 3500);
      } catch (err) {
        console.error('Error guardando audio:', err);
      } finally {
        setLoadingSlotId(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Restablecer una Ranura Específica a por Defecto ──
  const handleResetSoundSlot = async (slot: SoundSlot) => {
    if (previewingSlotId === slot.id) {
      audioEngine.stopPreview();
      setPreviewingSlotId(null);
    }
    await audioEngine.resetCustomSound(slot.id);
    setCustomSounds(audioEngine.getAllCustomSounds());
    setSoundSaveSuccess(`Sonido de "${slot.name}" restablecido al original por defecto.`);
    setTimeout(() => setSoundSaveSuccess(''), 3000);
  };

  // ── Restablecer Todos los Sonidos a Predeterminados ──
  const handleResetAllSoundsConfirm = async () => {
    audioEngine.stopPreview();
    setPreviewingSlotId(null);
    await audioEngine.resetAllCustomSounds();
    setCustomSounds({});
    setShowResetAllSoundsModal(false);
    setSoundSaveSuccess('¡Todos los sonidos se han restablecido a los originales por defecto!');
    setTimeout(() => setSoundSaveSuccess(''), 4500);
  };

  // ── Guardar Toda la Configuración de Sonidos (Aplica a Todos los Juegos) ──
  const handleSaveSoundConfig = () => {
    audioEngine.updateAudioSettings({
      musicEnabled,
      applyToAllGames: true,
      musicVolume,
      effectsVolume,
      effectsEnabled,
    });
    window.dispatchEvent(new CustomEvent('axels_play_sounds_updated'));
    setSoundSaveSuccess('¡Configuración de sonidos guardada exitosamente! Se ha sincronizado para todos los juegos.');
    setTimeout(() => setSoundSaveSuccess(''), 4000);
  };

  const customCount = Object.keys(customSounds).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Sliders className="w-8 h-8 text-purple-400" />
          <span>Configuración de AXEL'S PLAY</span>
        </h1>
        <p className="text-white/60 text-sm mt-1">
          Ajusta la música general para todas tus partidas, efectos de sonido y reglas de juego.
        </p>
      </div>

      {soundSaveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-sm animate-fade-in shadow-xl backdrop-blur-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span className="font-bold">{soundSaveSuccess}</span>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* ── SECCIÓN SUPER ADMIN: CONFIGURACIÓN DE MÚSICA DE LOS JUEGOS ── */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <div className="card p-6 sm:p-8 border-purple-500/40 bg-gradient-to-b from-slate-900 via-slate-900/95 to-indigo-950/40 shadow-2xl space-y-6 rounded-3xl">
        
        {/* Cabecera del Módulo de Música */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/40 to-indigo-600/30 border border-purple-500/50 flex items-center justify-center shadow-lg shadow-purple-900/30">
              <Headphones className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">Configuración de Música</h2>
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-purple-200/80 font-medium mt-0.5">
                Carga y personaliza las secciones de música de las partidas: Sala de espera, preguntas estándar y largas, conteo 3-2-1 y podio final.
              </p>
            </div>
          </div>

          {/* Botones Globales de Guardar y Resetear */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowResetAllSoundsModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 flex items-center gap-1.5 transition-all shadow-md"
              title="Restablece todas las músicas a los valores predeterminados por defecto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetear Todas</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSoundConfig}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 transition-all shadow-lg shadow-emerald-700/30"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Música</span>
            </button>
          </div>
        </div>

        {/* Banner Informativo con Reglas Específicas Solicitadas */}
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-purple-300 font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Reglas de Música en Todas las Partidas:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white/80">
            <div className="flex items-start gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Regla de Preguntas de 30s o Más:</strong>
                Preguntas de &lt; 30s usan la <em>Música de Preguntas Estándar</em>. Preguntas de 30s o más activan la pista adicional <em>Música de Preguntas Largas</em>.
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
              <Repeat className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Repetición en Bucle de Audios Cortos:</strong>
                Si el audio cargado es más corto que el tiempo de la pregunta, se repetirá continuamente en bucle hasta que finalice el tiempo.
              </div>
            </div>
          </div>
          <div className="text-[11px] text-white/60 flex items-center gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>
              Estas pistas se aplican a <strong>todos los juegos</strong>. Si no has cargado un archivo propio, se conservan intactos los sonidos por defecto.
            </span>
          </div>
        </div>

        {/* Controles Maestros de Volumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          {/* Volumen Música */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !musicEnabled;
                    setMusicEnabled(next);
                    audioEngine.setMusicEnabled(next);
                  }}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    musicEnabled ? 'bg-purple-600/30 text-purple-300' : 'bg-white/10 text-white/40'
                  }`}
                  title={musicEnabled ? 'Silenciar Música' : 'Activar Música'}
                >
                  {musicEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Música de Fondo (PC Docente)
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-purple-300">
                {musicEnabled ? `${Math.round(musicVolume * 100)}%` : 'Silenciado'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              disabled={!musicEnabled}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setMusicVolume(vol);
                audioEngine.setMusicVolume(vol);
              }}
              className="w-full accent-purple-500 cursor-pointer disabled:opacity-30"
            />
          </div>

          {/* Volumen Efectos SFX */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !effectsEnabled;
                    setEffectsEnabled(next);
                    audioEngine.setEffectsEnabled(next);
                  }}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    effectsEnabled ? 'bg-amber-600/30 text-amber-300' : 'bg-white/10 text-white/40'
                  }`}
                  title={effectsEnabled ? 'Silenciar Efectos' : 'Activar Efectos'}
                >
                  {effectsEnabled ? <Zap className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Efectos de Sonido / SFX
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-300">
                {effectsEnabled ? `${Math.round(effectsVolume * 100)}%` : 'Silenciado'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={effectsVolume}
              disabled={!effectsEnabled}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setEffectsVolume(vol);
                audioEngine.setSfxVolume(vol);
              }}
              className="w-full accent-amber-400 cursor-pointer disabled:opacity-30"
            />
          </div>
        </div>

        {/* Encabezado de Lista de Ranuras */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Music className="w-4 h-4 text-purple-400" />
            <span>Secciones de Música ({SOUND_SLOTS.length})</span>
          </div>

          <div className="text-xs text-white/50 font-medium">
            Personalizadas: <span className="font-bold text-emerald-400">{customCount}</span> de {SOUND_SLOTS.length}
          </div>
        </div>

        {/* ── LISTA DE RANURAS DE MÚSICA ── */}
        <div className="space-y-3 pt-1">
          {SOUND_SLOTS.map((slot) => {
            const custom = customSounds[slot.id];
            const isCustom = !!custom;
            const isPlayingThis = previewingSlotId === slot.id;
            const isLoadingThis = loadingSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={`p-4 rounded-2xl transition-all border ${
                  isCustom
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Información Principal de la Música */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1.5 rounded-lg bg-purple-600/30 text-purple-300">
                        <Music className="w-4 h-4" />
                      </div>

                      <h3 className="text-sm font-black text-white">{slot.name}</h3>

                      {slot.isSpecialRule && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-yellow-300 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Repeat className="w-3 h-3" />
                          Bucle Continuo
                        </span>
                      )}

                      {isCustom ? (
                        <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Personalizado: {custom.fileName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                          Por Defecto
                        </span>
                      )}
                    </div>

                    {/* DÓNDE SUENA EL SONIDO */}
                    <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200/90 flex items-start gap-2">
                      <span className="font-bold text-purple-300 shrink-0">📍 Dónde suena:</span>
                      <span>{slot.location}</span>
                    </div>

                    {!isCustom && (
                      <p className="text-[11px] text-white/40 pl-1">
                        🔊 Predeterminado: {slot.defaultDescription}
                      </p>
                    )}
                  </div>

                  {/* Acciones: Preescuchar, Cargar Audio, Restablecer */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Botón de Preescucha */}
                    <button
                      type="button"
                      onClick={() => handleTogglePreview(slot.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                        isPlayingThis
                          ? 'bg-amber-600 text-white hover:bg-amber-500 animate-pulse'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      title={isPlayingThis ? 'Detener preescucha' : 'Escuchar cómo suena'}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Detener</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>{isCustom ? 'Probar Audio' : 'Escuchar Default'}</span>
                        </>
                      )}
                    </button>

                    {/* Botón Cargar Audio */}
                    <label
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md ${
                        isLoadingThis
                          ? 'bg-purple-800 text-white opacity-60 cursor-wait'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                      }`}
                    >
                      {isLoadingThis ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isCustom ? 'Cambiar Audio' : 'Cargar Audio'}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="audio/*,.mp3,.ogg,.wav,.m4a"
                        disabled={isLoadingThis}
                        className="hidden"
                        onChange={(e) => handleUploadSoundSlot(slot, e)}
                      />
                    </label>

                    {/* Botón Restablecer Ranura (Solo si es personalizada) */}
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleResetSoundSlot(slot)}
                        className="p-2 rounded-xl text-white/50 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
                        title="Restablecer este sonido al valor por defecto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie del Panel de Sonidos con Botón Guardar Principal */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-white/50">
            Al pulsar <strong>Guardar Configuración de Sonidos</strong>, todas las salas de juego actuales y futuras se actualizarán inmediatamente.
          </p>

          <button
            type="button"
            onClick={handleSaveSoundConfig}
            className="btn-primary py-3 px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 self-start sm:self-auto shadow-lg shadow-purple-600/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Configuración de Sonidos</span>
          </button>
        </div>
      </div>

      {/* REGLAS DEL JUEGO CONFIRMADAS */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span>Reglas Activas en AXEL'S PLAY</span>
        </h3>
        <ul className="text-xs text-white/70 space-y-1.5 list-disc pl-5">
          <li><strong>Música Exclusiva:</strong> Suena únicamente en el computador del docente; los celulares nunca reproducen música de fondo.</li>
          <li><strong>Detención Automática:</strong> La música de fondo se apaga en cuanto termina la animación del podio final.</li>
          <li><strong>Preguntas con Cuenta Regresiva:</strong> Si el audio es corto, se repite automáticamente hasta agotar el tiempo.</li>
          <li><strong>Robo de Puntos:</strong> 50 puntos fijos por robo, máximo 2 robos por estudiante, solo a rivales con 50+ puntos.</li>
          <li><strong>Clasificación Top 7:</strong> Se muestra en pantalla tras cada pregunta con puntuación por velocidad de respuesta.</li>
          <li><strong>Podio de Ganadores:</strong> Animación sincronizada revelando el 3.er puesto, 2.º puesto y el 1.er puesto campeón con confeti.</li>
        </ul>
      </div>

      {/* ── BARRA DE CAPACIDAD DE MEMORIA Y ALMACENAMIENTO ── */}
      <StorageUsageBar />

      {/* ── PANEL DE SUPER ADMIN: GESTIÓN DE DOCENTES ── */}
      <div className="card p-6 border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/30 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Panel de Super Admin — Gestión de Docentes</h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  Exclusivo Profe Axel
                </span>
              </div>
              <p className="text-xs text-white/50">Crea perfiles secundarios de profesores para otros cursos o elimínalos en cualquier momento.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNewTeacherModal(true)}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-purple-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Docente</span>
          </button>
        </div>

        {teacherActionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{teacherActionSuccess}</span>
          </div>
        )}

        {/* Lista de Docentes */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {teachersList.map((t) => {
            const isSuperAdmin = t.profile.role === 'superadmin' || t.email.toLowerCase().includes('profe@axelsplay.edu');
            return (
              <div
                key={t.email}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSuperAdmin ? 'bg-amber-500/20 text-yellow-300 border border-amber-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {t.profile.fullName ? t.profile.fullName[0].toUpperCase() : 'P'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{t.profile.fullName}</p>
                      {isSuperAdmin && (
                        <span className="text-[10px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                          SUPER ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 truncate">{t.email} · {t.profile.school || 'Colegio AXEL'}</p>
                  </div>
                </div>

                {!isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeacher(t.email)}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Eliminar este perfil de docente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECCIÓN DE RESETEO DE ESTADÍSTICAS ── */}
      <div className="p-6 rounded-3xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-red-300 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>Zona de Reinicio: Resetear Estadísticas</span>
          </h3>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Limpia el historial de partidas, puntuaciones acumuladas y estadísticas de prueba para comenzar un nuevo ciclo escolar desde cero.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          className="px-4 py-2.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-200 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-lg shadow-red-900/30"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Resetear Estadísticas</span>
        </button>
      </div>

      {resetSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>¡Estadísticas reiniciadas exitosamente! El sistema está completamente limpio para tus nuevas clases.</span>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR RESETEO DE TODOS LOS SONIDOS A DEFECTO ── */}
      {showResetAllSoundsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowResetAllSoundsModal(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">¿Restablecer Todos los Sonidos?</h3>
              <p className="text-xs text-white/60 mt-1">
                Esta acción eliminará todos los archivos de audio personalizados que hayas subido y restablecerá todas las ranuras de música y efectos a los sonidos originales por defecto del sistema.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Los sonidos procedurales del sintetizador y pistas oficiales continuarán funcionando con normalidad.</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetAllSoundsModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetAllSoundsConfirm}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-colors shadow-lg shadow-red-700/30"
              >
                Sí, Restablecer Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Docente */}
      {showNewTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowNewTeacherModal(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
              <UserPlus className="w-5 h-5 text-purple-400" />
              <span>Crear Perfil de Docente</span>
            </h3>
            <p className="text-xs text-white/50 mb-4">El nuevo docente podrá iniciar sesión y crear sus propios juegos.</p>

            {teacherActionError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold">
                {teacherActionError}
              </div>
            )}

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lic. Carlos Mendoza"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="input text-xs w-full py-2 bg-slate-950 border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="docente@colegio.edu"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="input text-xs w-full py-2 bg-slate-950 border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Contraseña Inicial *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  className="input text-xs w-full py-2 bg-slate-950 border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Institución Educativa (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Colegio Experimental AXEL"
                  value={newTeacherSchool}
                  onChange={(e) => setNewTeacherSchool(e.target.value)}
                  className="input text-xs w-full py-2 bg-slate-950 border-white/10"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewTeacherModal(false)}
                  className="btn-secondary w-1/2 py-2 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary w-1/2 py-2 text-xs font-bold"
                >
                  Crear Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Reseteo Estadísticas */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">¿Resetear Todas las Estadísticas?</h3>
              <p className="text-xs text-white/60 mt-1">
                Esta acción borrará el historial de partidas, ranking acumulado de alumnos y registros de entregas de tareas escolares para comenzar un ciclo completamente limpio.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold">
              ⚠️ Esta acción no se puede deshacer. Los juegos creados y preguntas NO serán borrados.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteResetStats}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-colors shadow-lg shadow-red-700/30"
              >
                Sí, Resetear Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}