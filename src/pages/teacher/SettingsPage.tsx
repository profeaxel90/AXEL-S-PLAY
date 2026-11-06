import { useState } from 'react';
import { audioEngine, OFFICIAL_TRACK_NAME, OFFICIAL_TRACK_URL } from '../../lib/audio';
import {
  Volume2, VolumeX, Music, Sliders, CheckCircle2,
  Sparkles, Play, Pause, Square, Upload, ShieldCheck, Zap
} from 'lucide-react';

export default function SettingsPage() {
  const currentSettings = audioEngine.getSettings();

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
    </div>
  );
}
