// ============================================================
// AXEL'S PLAY - Motor de Audio Profesional Completo
// Música de fondo procedural en tiempo real (Web Audio API)
// Efectos de sonido instantáneos y control de volumen
// ============================================================
import type { AudioSceneContext, AudioSettings } from '../types';

class MusicSynthesizer {
  private ctx: AudioContext | null = null;
  private masterMusicGain: GainNode | null = null;
  private masterSfxGain: GainNode | null = null;
  private isPlaying = false;
  private currentTrack: 'lobby' | 'question' | 'suspense' | 'podium' | null = null;
  private timerId: any = null;
  private step = 0;
  private volume = 0.75;
  private sfxVolume = 0.8;
  private userUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.unlockContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
    }
  }

  public unlockContext() {
    this.initCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.userUnlocked = true;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // Compresor de dinámica para sonido profesional sin distorsión
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        compressor.knee.setValueAtTime(30, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
        compressor.connect(this.ctx.destination);

        // Canales separados para música y efectos
        this.masterMusicGain = this.ctx.createGain();
        this.masterMusicGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterMusicGain.connect(compressor);

        this.masterSfxGain = this.ctx.createGain();
        this.masterSfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.masterSfxGain.connect(compressor);
      }
    }
  }

  public setMusicVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterMusicGain && this.ctx) {
      this.masterMusicGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.masterSfxGain && this.ctx) {
      this.masterSfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  // ── Primitivas de Sonido Acústico Natural Estilo Kahoot (Marimba de Madera, Silencios y Pizzicato Cálido) ──
  // 1. Marimba Acústica Natural: Barra de madera de palisandro con resonador cálido (suave, nada chillón)
  private playMarimba(freq: number, time: number, duration = 0.16, vol = 0.085) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Senoide pura filtrada para eliminar asperezas digitales
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + duration);

    // Envolvente de baqueta de fieltro sobre madera: ataque suave (4ms) y decaimiento natural
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  // 2. Toque de Madera Orgánico Suave (espaciado, solo para marcar el pulso del aula)
  private playWoodblock(time: number, pitch = 920, vol = 0.035) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, time + 0.022);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch, time);
    filter.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);

    osc.start(time);
    osc.stop(time + 0.028);
  }

  // 3. Bajo Acústico Pizzicato Cálido (cuerdas de contrabajo suaves, sin retumbes)
  private playPizzicatoBass(freq: number, time: number, duration = 0.22, vol = 0.12) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);
    filter.frequency.exponentialRampToValueAtTime(90, time + duration);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  // ── Secuenciadores Musicales Anti-Fatiga (Frases Espaciadas con Silencios de Respiración) ──
  // 1. Lobby Theme: 116 BPM, relajado, alegre, marimba dulce con pausas amplias
  private tickLobby(time: number, step: number) {
    const beat16 = step % 16;
    const bar64 = step % 64; // Ciclo amplio de 4 compases

    // Pulso muy sutil de madera únicamente en tiempos 2 y 4 (sin machacar)
    if (beat16 === 4 || beat16 === 12) {
      this.playWoodblock(time, 950, 0.03);
    }

    // Melodía con silencios amplios (respiración musical que no fatiga el oído)
    // Compás 1: Frase inicial alegre
    // Compás 2: Silencio de reposo con solo bajo suave
    // Compás 3: Respuesta melódica
    // Compás 4: Cierre con arpegio suave
    const lobbyNotes: Record<number, number> = {
      // Compás 1: Frase A (D - F - E - D)
      0: 293.66,  // D4
      3: 349.23,  // F4
      6: 329.63,  // E4
      9: 293.66,  // D4
      // Compás 2: Silencio melódico (deja respirar)
      // Compás 3: Frase B (C - D - G - A)
      32: 261.63, // C4
      35: 293.66, // D4
      38: 392.00, // G4
      42: 440.00, // A4
      // Compás 4: Cierre suave
      48: 392.00, // G4
      54: 523.25, // C5
    };

    if (lobbyNotes[bar64]) {
      this.playMarimba(lobbyNotes[bar64], time, 0.16, 0.08);
    }

    // Bajo cálido únicamente en el primer tiempo de cada compás (beat16 === 0)
    if (beat16 === 0) {
      const bassProg = [146.83, 116.54, 130.81, 146.83]; // D3, Bb2, C3, D3
      const cIdx = Math.floor(bar64 / 16);
      this.playPizzicatoBass(bassProg[cIdx], time, 0.28, 0.13);
    }
  }

  // 2. Question Theme: 120 BPM, cuenta regresiva lúdica con frases de marimba espaciadas
  private tickQuestion(time: number, step: number) {
    const beat16 = step % 16;
    const bar64 = step % 64;

    // Reloj suave únicamente en negras (tiempos 0, 4, 8, 12), volumen ultra bajo no invasivo
    if (beat16 % 4 === 0) {
      this.playWoodblock(time, 1020, 0.025);
    }

    // Melodía de marimba con espacio para pensar:
    // Toca 3 notas, luego pausa de 2 tiempos, luego respuesta
    const questionPhrases: Record<number, number> = {
      // Compás 1
      0: 587.33,  // D5
      4: 698.46,  // F5
      8: 659.25,  // E5
      // Compás 2: Salto característico de Kahoot
      16: 622.25, // Eb5
      20: 587.33, // D5
      24: 622.25, // Eb5
      // Compás 3: Pausa reflexiva
      // Compás 4: Arpegio ascendente ágil
      48: 523.25, // C5
      52: 587.33, // D5
      56: 698.46, // F5
      60: 783.99, // G5
    };

    if (questionPhrases[bar64]) {
      this.playMarimba(questionPhrases[bar64], time, 0.14, 0.085);
    }

    // Bajo discreto en tiempos 0 y 8
    if (beat16 === 0 || beat16 === 8) {
      const qBass = bar64 < 32 ? 146.83 : 130.81; // D3 o C3
      this.playPizzicatoBass(qBass, time, 0.2, 0.11);
    }
  }

  // 3. Podium: 128 BPM, fanfarria triunfal en marimba y campanas de victoria (sin bombos)
  private tickPodium(time: number, step: number) {
    const beat16 = step % 16;
    const phrase32 = step % 32;

    // Woodblock festivo
    if (beat16 % 4 === 2) {
      this.playWoodblock(time, 1300, 0.06);
    }

    // Arpegios mayores triunfales en marimba
    const victoryNotes = [
      523.25, 659.25, 783.99, 1046.5, // C5, E5, G5, C6
      587.33, 739.99, 880.00, 1174.66,// D5, F#5, A5, D6
    ];
    if (beat16 % 2 === 0) {
      const idx = (beat16 / 2 + Math.floor(phrase32 / 16) * 4) % victoryNotes.length;
      this.playMarimba(victoryNotes[idx], time, 0.15, 0.17);
    }

    // Bajo de celebración
    if (beat16 === 0 || beat16 === 8) {
      this.playPizzicatoBass(130.81, time, 0.25, 0.22); // C3
    }
  }

  // 4. Suspense: 96 BPM, misterioso y sutil con marimba en notas bajas
  private tickSuspense(time: number, step: number) {
    const beat16 = step % 16;
    if (beat16 === 0 || beat16 === 8) {
      this.playWoodblock(time, 800, 0.05);
    }
    if (beat16 === 4) {
      this.playMarimba(369.99, time, 0.2, 0.12); // F#4
    } else if (beat16 === 12) {
      this.playMarimba(392.00, time, 0.2, 0.12); // G4
    }
    if (beat16 === 0) {
      this.playPizzicatoBass(92.5, time, 0.3, 0.2); // F#2
    }
  }

  // ── Control de Reproducción de Música ──
  public startMusic(track: 'lobby' | 'question' | 'suspense' | 'podium') {
    this.unlockContext();
    if (this.currentTrack === track && this.isPlaying) return;

    this.stopMusic();
    this.currentTrack = track;
    this.isPlaying = true;
    this.step = 0;

    const bpm = track === 'question' ? 136 : track === 'lobby' ? 124 : track === 'suspense' ? 96 : 128;
    const stepDurationMs = (60 / bpm / 4) * 1000; // semicorchea

    this.timerId = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;

      if (this.currentTrack === 'lobby') {
        this.tickLobby(now, this.step);
      } else if (this.currentTrack === 'question') {
        this.tickQuestion(now, this.step);
      } else if (this.currentTrack === 'suspense') {
        this.tickSuspense(now, this.step);
      } else if (this.currentTrack === 'podium') {
        this.tickPodium(now, this.step);
      }

      this.step++;
    }, stepDurationMs);
  }

  public stopMusic() {
    this.isPlaying = false;
    this.currentTrack = null;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public getTrack(): string | null {
    return this.isPlaying ? this.currentTrack : null;
  }

  // ── Efectos de Sonido Sintéticos (Cero Latencia) ──
  public playEffectTone(freq: number, type: OscillatorType, duration: number, gainVal = 0.25) {
    try {
      this.initCtx();
      if (!this.ctx || !this.masterSfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.masterSfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignorar si el audio no está inicializado
    }
  }

  public playCorrect() {
    this.playEffectTone(523.25, 'triangle', 0.14, 0.3); // C5
    setTimeout(() => this.playEffectTone(659.25, 'triangle', 0.14, 0.3), 80); // E5
    setTimeout(() => this.playEffectTone(783.99, 'triangle', 0.28, 0.35), 160); // G5
  }

  public playIncorrect() {
    this.playEffectTone(280, 'sawtooth', 0.18, 0.2);
    setTimeout(() => this.playEffectTone(210, 'sawtooth', 0.28, 0.2), 110);
  }

  public playCountdown() {
    this.playEffectTone(880, 'sine', 0.08, 0.25);
  }

  public playTick() {
    this.playEffectTone(600, 'sine', 0.04, 0.12);
  }

  public playJoin() {
    this.playEffectTone(440, 'sine', 0.1, 0.2);
    setTimeout(() => this.playEffectTone(659.25, 'sine', 0.15, 0.25), 85);
  }

  public playPowerUp() {
    const notes = [440, 554.37, 659.25, 880, 1108.7];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playEffectTone(freq, 'sine', 0.12, 0.25), idx * 55);
    });
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playEffectTone(freq, 'triangle', 0.25, 0.3), idx * 110);
    });
  }

  public playStealAlert() {
    const notes = [440, 880, 554.37, 1108.7, 659.25, 1318.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playEffectTone(freq, 'sawtooth', 0.12, 0.35), idx * 45);
    });
  }

  public playStealWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playEffectTone(freq, 'triangle', 0.18, 0.35), idx * 50);
    });
  }

  public playStealLost() {
    this.playEffectTone(200, 'sine', 0.25, 0.25);
  }

  // Cascada de monedas digitales para la tabla de clasificación
  public playDigitalCoins() {
    const coinTones = [
      { freq: 987.77, delay: 0 },    // B5
      { freq: 1318.51, delay: 65 },  // E6
      { freq: 1046.50, delay: 130 }, // C6
      { freq: 1567.98, delay: 195 }, // G6
      { freq: 1318.51, delay: 260 }, // E6
      { freq: 1760.00, delay: 325 }, // A6
      { freq: 1975.53, delay: 390 }, // B6
      { freq: 2093.00, delay: 455 }, // C7
      { freq: 2637.02, delay: 520 }, // E7
    ];
    coinTones.forEach(({ freq, delay }) => {
      setTimeout(() => {
        this.playEffectTone(freq, 'sine', 0.15, 0.32);
        this.playEffectTone(freq * 1.5, 'triangle', 0.08, 0.15);
      }, delay);
    });
  }

  // Sonido de finalización armónico estilo Kahoot ("¡Bing-Bong!") cuando termina el tiempo o todos responden
  public playTimeUp() {
    // 1er tono de campana alta (G5 - 783.99 Hz)
    this.playEffectTone(783.99, 'sine', 0.22, 0.45);
    this.playEffectTone(1567.98, 'triangle', 0.14, 0.25);
    // 2do tono descendente de resolución con bajo de concurso (C5 - 523.25 Hz + C4)
    setTimeout(() => {
      this.playEffectTone(523.25, 'sine', 0.45, 0.5);
      this.playEffectTone(1046.50, 'triangle', 0.28, 0.3);
      this.playEffectTone(261.63, 'sine', 0.5, 0.35);
    }, 130);
  }

  public playIntroFanfare() {
    const chord = [392, 523.25, 659.25, 783.99];
    chord.forEach((f) => this.playEffectTone(f, 'triangle', 0.6, 0.3));
  }
}

// ── Música de Podio épica/celebratoria (diferente al lobby) ──
// 140 BPM, fanfarria triunfal con acordes mayores en escalada
class PodiumMusicSequencer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private timerId: any = null;
  private step = 0;

  constructor(ctx: AudioContext, masterGain: GainNode) {
    this.ctx = ctx;
    this.masterGain = masterGain;
  }

  private playNote(freq: number, time: number, duration = 0.18, type: OscillatorType = 'triangle', vol = 0.14) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playKick(time: number, vol = 0.4) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  private tick(time: number, step: number) {
    const beat16 = step % 16;
    // Fase de acordes épicos: C→E→G→C5 en escalada
    const epicChords = [
      [523.25, 659.25, 783.99, 1046.5],  // C mayor
      [587.33, 739.99, 880.0, 1174.66],  // D mayor
      [659.25, 830.61, 987.77, 1318.5],  // E mayor
      [783.99, 987.77, 1174.66, 1567.98],// G mayor
    ];
    const chordIdx = Math.floor((step % 64) / 16);
    const chord = epicChords[chordIdx];

    // Kick fuerte en tiempos 1 y 3
    if (beat16 === 0 || beat16 === 8) {
      this.playKick(time, 0.45);
    }
    // Snare en tiempos 2 y 4
    if (beat16 === 4 || beat16 === 12) {
      this.playKick(time, 0.3);
    }
    // Bajo pulsante
    if (beat16 % 4 === 0) {
      this.playNote(chord[0] / 2, time, 0.28, 'sawtooth', 0.3);
    }
    // Acordes de fanfarria en cada tiempo fuerte
    if (beat16 % 4 === 0) {
      chord.forEach((f) => this.playNote(f, time, 0.24, 'triangle', 0.13));
    }
    // Melodía de triunfo ascendente
    const melodyMap: Record<number, number> = {
      2: 1046.5,
      6: 1174.66,
      10: 1318.5,
      14: 1567.98,
    };
    if (melodyMap[beat16]) {
      this.playNote(melodyMap[beat16], time, 0.16, 'square', 0.1);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;
    const bpm = 140;
    const stepMs = (60 / bpm / 4) * 1000;
    this.timerId = setInterval(() => {
      if (!this.ctx || !this.isPlaying) return;
      this.tick(this.ctx.currentTime, this.step);
      this.step++;
    }, stepMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

// ── Constantes de Música Oficial ──
export const OFFICIAL_TRACK_NAME = '"Stranger Things" (Kyle Dixon & Michael Stein)';
export const OFFICIAL_TRACK_URL = '/audio/stranger_things_theme.wav';

// ── Motor de Audio Global de AXEL'S PLAY ──
class AudioEngine {
  private synth = new MusicSynthesizer();
  private podiumSequencer: PodiumMusicSequencer | null = null;
  private settings: AudioSettings = {
    musicEnabled: true,
    effectsEnabled: true,
    musicVolume: 0.75,
    effectsVolume: 0.85,
    defaultTrackUrl: OFFICIAL_TRACK_URL,
    defaultTrackName: OFFICIAL_TRACK_NAME,
    applyToAllGames: true,
  };

  // Audio personalizado o música oficial cargada
  private customAudio: HTMLAudioElement | null = null;
  private customFileName: string | null = null;
  private customPlaying = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem('axelplay_audio');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // defaults
    }
    // Asegurar valores por defecto de la pista oficial si no estuvieran definidos
    if (!this.settings.defaultTrackUrl) {
      this.settings.defaultTrackUrl = OFFICIAL_TRACK_URL;
    }
    if (!this.settings.defaultTrackName) {
      this.settings.defaultTrackName = OFFICIAL_TRACK_NAME;
    }
    if (this.settings.applyToAllGames === undefined) {
      this.settings.applyToAllGames = true;
    }

    this.synth.setMusicVolume(this.settings.musicEnabled ? this.settings.musicVolume : 0);
    this.synth.setSfxVolume(this.settings.effectsEnabled ? this.settings.effectsVolume : 0);
  }

  private saveSettings() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('axelplay_audio', JSON.stringify(this.settings));
  }

  public updateAudioSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.synth.setMusicVolume(this.settings.musicEnabled ? this.settings.musicVolume : 0);
    this.synth.setSfxVolume(this.settings.effectsEnabled ? this.settings.effectsVolume : 0);
    if (this.customAudio) {
      this.customAudio.volume = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    }
    this.saveSettings();
  }

  public unlock() {
    this.synth.unlockContext();
  }

  public playMusic(track: 'lobby' | 'question' | 'suspense' | 'podium') {
    if (!this.settings.musicEnabled) return;
    // Si hay audio oficial/personalizado activo, no iniciar la síntesis
    if (this.customPlaying) return;
    this.synth.startMusic(track);
  }

  public stopMusic() {
    this.synth.stopMusic();
    this.stopCustomAudio();
  }

  // ── Reproducción de Pista Oficial o Personalizada ──
  public playOfficialTrack(): void {
    const trackUrl = this.settings.defaultTrackUrl || OFFICIAL_TRACK_URL;
    const trackName = this.settings.defaultTrackName || OFFICIAL_TRACK_NAME;
    this.playTrackByUrl(trackUrl, trackName);
  }

  public playTrackByUrl(url: string, name?: string): void {
    this.synth.stopMusic();
    this.stopCustomAudio();

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    audio.play().catch((err) => {
      console.warn('Audio autoplay blocked, requires user click:', err);
    });

    this.customAudio = audio;
    this.customFileName = name || 'Música de Fondo';
    this.customPlaying = true;
  }

  public playCustomAudio(fileOrUrl: File | string, customName?: string): void {
    this.synth.stopMusic();
    this.stopCustomAudio();

    let url: string;
    let name: string;

    if (typeof fileOrUrl === 'string') {
      url = fileOrUrl;
      name = customName || 'Música Oficial';
    } else {
      url = URL.createObjectURL(fileOrUrl);
      name = fileOrUrl.name;
    }

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    audio.play().catch(() => {});

    this.customAudio = audio;
    this.customFileName = name;
    this.customPlaying = true;
  }

  public stopCustomAudio(): void {
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio.src = '';
      this.customAudio = null;
      this.customFileName = null;
    }
    this.customPlaying = false;
  }

  public pauseCustomAudio(): void {
    if (this.customAudio && !this.customAudio.paused) {
      this.customAudio.pause();
    }
  }

  public resumeCustomAudio(): void {
    if (this.customAudio && this.customAudio.paused) {
      this.customAudio.play().catch(() => {});
    }
  }

  public toggleCustomAudio(): boolean {
    if (!this.customAudio) return false;
    if (this.customAudio.paused) {
      this.customAudio.play().catch(() => {});
      return true;
    } else {
      this.customAudio.pause();
      return false;
    }
  }

  public getCustomFileName(): string | null {
    return this.customFileName;
  }

  public isCustomAudioPlaying(): boolean {
    return this.customPlaying && this.customAudio !== null && !this.customAudio.paused;
  }

  public getCurrentTrack(): 'lobby' | 'question' | 'suspense' | 'podium' | null {
    return this.synth.getTrack() as any;
  }

  public playEffect(key: string) {
    if (!this.settings.effectsEnabled) return;

    switch (key) {
      case 'sfx_correct':
        this.synth.playCorrect();
        break;
      case 'sfx_incorrect':
      case 'sfx_wrong':
        this.synth.playIncorrect();
        break;
      case 'sfx_countdown':
        this.synth.playCountdown();
        break;
      case 'sfx_tick':
        this.synth.playTick();
        break;
      case 'sfx_podium':
      case 'sfx_victory':
        this.synth.playVictory();
        break;
      case 'sfx_power_up':
      case 'sfx_power_assigned':
        this.synth.playPowerUp();
        break;
      case 'sfx_join':
        this.synth.playJoin();
        break;
      case 'sfx_steal_alert':
        this.synth.playStealAlert();
        break;
      case 'sfx_steal_win':
        this.synth.playStealWin();
        break;
      case 'sfx_steal_lost':
        this.synth.playStealLost();
        break;
      case 'sfx_digital_coins':
      case 'sfx_coins':
        this.synth.playDigitalCoins();
        break;
      case 'sfx_intro':
        this.synth.playIntroFanfare();
        break;
      case 'sfx_time_up':
      case 'sfx_buzzer':
        this.synth.playTimeUp();
        break;
      default:
        this.synth.playTick();
        break;
    }
  }

  // Métodos específicos para música de preguntas y lobby
  public playQuestionMusic() {
    if (!this.settings.musicEnabled) return;
    this.synth.startMusic('question');
  }

  public stopQuestionMusic() {
    if (this.synth.getTrack() === 'question') {
      this.synth.stopMusic();
    }
  }

  public playLobbyMusic() {
    if (!this.settings.musicEnabled) return;
    if (this.customAudio) {
      this.customAudio.play().catch(() => {});
      this.customPlaying = true;
    } else {
      this.synth.startMusic('lobby');
    }
  }

  public stopLobbyMusic() {
    this.stopCustomAudio();
    if (this.synth.getTrack() === 'lobby') {
      this.synth.stopMusic();
    }
  }

  // ── Música de Podio épica/celebratoria (140 BPM, fanfarria triunfal) ──
  public playPodiumMusic() {
    if (!this.settings.musicEnabled) return;
    this.synth.stopMusic();
    this.stopCustomAudio();
    this.unlock();
    // Usar la pista 'podium' del sintetizador (ya tiene fanfarria épica)
    this.synth.startMusic('podium');
  }

  // ── Síntesis de Voz Desactivada a Petición del Docente ──
  public speakAxelsPlay() {
    // Desactivado: el usuario prefirió la experiencia limpia sin voz sintética
  }

  public setContext(context: AudioSceneContext | 'intro' | 'suspense') {
    // La música predeterminada YA NO se reproduce automáticamente.
    // Solo se ejecutan los efectos de sonido puntuales (SFX).
    switch (context) {
      case 'intro':
        this.playEffect('sfx_intro');
        break;
      case 'game_start':
        this.synth.playEffectTone(392, 'square', 0.2, 0.25);
        break;
      case 'countdown':
        this.playEffect('sfx_countdown');
        break;
      case 'correct':
        this.playEffect('sfx_correct');
        break;
      case 'incorrect':
        this.playEffect('sfx_incorrect');
        break;
      case 'power_up':
        this.playEffect('sfx_power_up');
        break;
      case 'podium':
        // Podio: No inicia música sintética automática.
        break;
    }
  }

  public toggleMusic(): boolean {
    const next = !this.settings.musicEnabled;
    this.setMusicEnabled(next);
    return next;
  }

  public toggleEffects(): boolean {
    const next = !this.settings.effectsEnabled;
    this.setEffectsEnabled(next);
    return next;
  }

  public setMusicEnabled(enabled: boolean) {
    this.settings.musicEnabled = enabled;
    this.synth.setMusicVolume(enabled ? this.settings.musicVolume : 0);
    if (!enabled) {
      this.synth.stopMusic();
      if (this.customAudio) this.customAudio.volume = 0;
    } else {
      if (this.customAudio) this.customAudio.volume = this.settings.musicVolume;
    }
    this.saveSettings();
  }

  public setEffectsEnabled(enabled: boolean) {
    this.settings.effectsEnabled = enabled;
    this.synth.setSfxVolume(enabled ? this.settings.effectsVolume : 0);
    this.saveSettings();
  }

  public setSfxVolume(vol: number) {
    this.settings.effectsVolume = vol;
    if (this.settings.effectsEnabled) {
      this.synth.setSfxVolume(vol);
    }
    this.saveSettings();
  }

  public setMusicVolume(vol: number) {
    this.settings.musicVolume = vol;
    if (this.settings.musicEnabled) {
      this.synth.setMusicVolume(vol);
      if (this.customAudio) this.customAudio.volume = vol;
    }
    this.saveSettings();
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public isMusicPlaying(): boolean {
    return this.synth.getTrack() !== null;
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
