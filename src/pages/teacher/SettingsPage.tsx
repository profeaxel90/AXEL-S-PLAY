import { useState } from 'react';
import { audioEngine, OFFICIAL_TRACK_NAME, OFFICIAL_TRACK_URL } from '../../lib/audio';
import { useAuthStore, type StoredAccount } from '../../stores/authStore';
import { useHomeworkStore } from '../../stores/homeworkStore';
import { useSessionHistoryStore } from '../../stores/sessionHistoryStore';
import StorageUsageBar from '../../components/common/StorageUsageBar';
import {
  Volume2, VolumeX, Music, Sliders, CheckCircle2,
  Sparkles, Play, Pause, Square, Upload, ShieldCheck, Zap,
  UserPlus, Users, Trash2, Shield, RotateCcw, AlertTriangle, X
} from 'lucide-react';

export default function SettingsPage() {
  const currentSettings = audioEngine.getSettings();
  const { user, getAllTeachers, createTeacher, deleteTeacher } = useAuthStore();
  const { clearAllHomeworkData } = useHomeworkStore();

  const [musicEnabled, setMusicEnabled] = useState(currentSettings.musicEnabled ?? true);
  const [applyToAllGames, setApplyToAllGames] = useState(currentSettings.applyToAllGames ?? true);
  const [musicVolume, setMusicVolume] = useState(currentSettings.musicVolume ?? 0.75);
  const [effectsVolume, setEffectsVolume] = useState(currentSettings.effectsVolume ?? 0.85);
  const [effectsEnabled, setEffectsEnabled] = useState(currentSettings.effectsEnabled ?? true);
  const [trackName, setTrackName] = useState(currentSettings.defaultTrackName || OFFICIAL_TRACK_NAME);
  const [trackUrl, setTrackUrl] = useState(currentSettings.defaultTrackUrl || OFFICIAL_TRACK_URL);

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customFileLoaded, setCustomFileLoaded] = useState(false);

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
      // Limpiar historial real de partidas
      useSessionHistoryStore.getState().clearHistory();
      localStorage.removeItem('axels_play_session_history');
      localStorage.removeItem('axelplay_session_history');
      localStorage.removeItem('axels_play_recent_sessions');
      // Limpiar tareas y entregas
      clearAllHomeworkData();
      setShowResetModal(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (e) {
      console.warn('Error resetting stats:', e);
    }
  };

  // Manejar reproducción previa
  const handleTogglePreview = () => {
    if (isPreviewPlaying) {
      audioEngine.stopMusic();
      setIsPreviewPlaying(false);
    } else {
      audioEngine.playTrackByUrl(trackUrl, trackName);
      setIsPreviewPlaying(true);
    }
  };

  // Guardar configuración general
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    audioEngine.updateAudioSettings({
      musicEnabled,
      applyToAllGames,
      musicVolume,
      effectsVolume,
      effectsEnabled,
      defaultTrackName: trackName,
      defaultTrackUrl: trackUrl,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Subir otra canción si el profesor lo desea
  const handleUploadCustomSong = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTrackUrl(url);
      setTrackName(file.name);
      setCustomFileLoaded(true);
      audioEngine.updateAudioSettings({
        defaultTrackName: file.name,
        defaultTrackUrl: url,
        applyToAllGames: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleRestoreStrangerThings = () => {
    setTrackUrl(OFFICIAL_TRACK_URL);
    setTrackName(OFFICIAL_TRACK_NAME);
    setCustomFileLoaded(false);
    audioEngine.updateAudioSettings({
      defaultTrackName: OFFICIAL_TRACK_NAME,
      defaultTrackUrl: OFFICIAL_TRACK_URL,
      applyToAllGames: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {saved && (
        <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center gap-3 text-green-300 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-400" />
          <span className="font-semibold">
            ¡Configuración guardada exitosamente! Se aplicará automáticamente a todas tus partidas.
          </span>
        </div>
      )}

      {/* SECCIÓN PRINCIPAL: MÚSICA PARA TODOS LOS JUEGOS */}
      <div className="card p-8 border-purple-500/30 bg-slate-900/80 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
              <Music className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Música Oficial para Todas las Partidas</h2>
              <p className="text-xs text-purple-300 font-medium">
                No necesitas subir archivos en cada ronda. El sistema la carga automáticamente.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/30">
            Control Exclusivo del Administrador
          </span>
        </div>

        {/* Tarjeta de la Canción Aprobada */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Canción Seleccionada para todos los juegos:
              </span>
            </div>
            <h3 className="text-lg font-black text-white">{trackName}</h3>
            <p className="text-xs text-white/60">
              Reproducción automática en tu PC como Docente · Los celulares de los estudiantes permanecen en silencio.
            </p>
          </div>

          {/* Botones de Preescucha y Restaurar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTogglePreview}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                isPreviewPlaying
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/30'
              }`}
            >
              {isPreviewPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Detener Escucha</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Escuchar Pista</span>
                </>
              )}
            </button>

            {customFileLoaded && (
              <button
                type="button"
                onClick={handleRestoreStrangerThings}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
              >
                Volver a "Stranger Things"
              </button>
            )}
          </div>
        </div>

        {/* Interruptor: Aplicar la misma música a todos los juegos */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <div>
            <p className="font-bold text-white text-sm">
              Poner la misma música a todos los juegos automáticamente
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              Al activar esta opción, cada vez que abras una sala de juego, esta canción estará lista sin pedirte subir nada.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={applyToAllGames}
              onChange={(e) => {
                setApplyToAllGames(e.target.checked);
                audioEngine.updateAudioSettings({ applyToAllGames: e.target.checked });
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>

        {/* Deslizadores de Volumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Volumen de Música */}
          <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span>Volumen de la Música (PC Administrador)</span>
              </label>
              <span className="text-xs font-mono font-bold text-purple-300">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setMusicVolume(vol);
                audioEngine.setMusicVolume(vol);
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Volumen de Efectos SFX (Bips de estudiantes) */}
          <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Efectos de Sonido / Bips Celulares</span>
              </label>
              <span className="text-xs font-mono font-bold text-yellow-300">
                {Math.round(effectsVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={effectsVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setEffectsVolume(vol);
                audioEngine.setSfxVolume(vol);
              }}
              className="w-full accent-yellow-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Opción Adicional: Subir un archivo personalizado para sustituir el tema */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white/70">
              ¿Deseas cambiar la música oficial por un archivo propio?
            </span>
          </div>
          <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 hover:border-purple-500/50 rounded-xl cursor-pointer hover:bg-white/[0.02] transition-colors">
            <Upload className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-white/70 font-semibold">
              Cargar archivo local (MP3, WAV, OGG) como música predeterminada
            </span>
            <input
              type="file"
              accept="audio/*,.mp3,.ogg,.wav,.m4a"
              className="hidden"
              onChange={handleUploadCustomSong}
            />
          </label>
        </div>

        {/* Botón Guardar Cambios */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleSave()}
            className="w-full btn-primary py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Guardar Configuración de Música</span>
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
          <li><strong>Música Exclusiva:</strong> Suena únicamente en el computador del docente; los celulares nunca reproducen música.</li>
          <li><strong>Detención Automática:</strong> La música se apaga en cuanto termina la animación del podio final.</li>
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
                  placeholder="Mínimo 6 caracteres"
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  className="input text-xs w-full py-2 bg-slate-950 border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Institución Educativa (Opcional)</label>
                <input
                  type="text"
                  placeholder="Colegio Experimental AXEL"
                  value={newTeacherSchool}
                  onChange={(e) => setNewTeacherSchool(e.target.value)}
                  className="input text-xs w-full py-2 bg-slate-950 border-white/10"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewTeacherModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                >
                  Crear Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Reseteo */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white">¿Resetear Todas las Estadísticas?</h3>
            <p className="text-xs text-white/60 mt-1 mb-5">
              Se eliminarán los historiales de partidas en vivo y entregas acumuladas para dejar el panel en blanco. Tus juegos creados NO se borrarán.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteResetStats}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
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
