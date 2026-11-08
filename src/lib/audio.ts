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

  // ── Primitivas de Sonido Sintético Estilo Kahoot (Marimba, Woodblock, Pluck) ──
  // 1. Marimba de Kahoot: madera percusiva limpia, staccato y cálida
  private playMarimba(freq: number, time: number, duration = 0.11, vol = 0.16) {
    if (!this.ctx || !this.masterMusicGain) return;
    // Tono fundamental senoidal limpio
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    gain1.gain.setValueAtTime(vol, time);
    gain1.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc1.connect(gain1);
    gain1.connect(this.masterMusicGain);
    osc1.start(time);
    osc1.stop(time + duration + 0.02);

    // Armónico suave de octava que da el timbre auténtico a lámina de madera
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, time);
    gain2.gain.setValueAtTime(vol * 0.35, time);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.55);
    osc2.connect(gain2);
    gain2.connect(this.masterMusicGain);
    osc2.start(time);
    osc2.stop(time + duration * 0.55 + 0.02);
  }

  // 2. Woodblock de Kahoot: el clásico "clac" de bloque de madera o reloj tictac
  private playWoodblock(time: number, pitch = 1050, vol = 0.065) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, time + 0.025);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch, time);
    filter.Q.setValueAtTime(4.5, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);
    osc.start(time);
    osc.stop(time + 0.032);
  }

  // 3. Bajo Pizzicato elástico y juguetón (slap suave estilo Kahoot, sin tambores pesados)
  private playPizzicatoBass(freq: number, time: number, duration = 0.16, vol = 0.18) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.exponentialRampToValueAtTime(110, time + duration);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  // ── Secuenciadores de Música Procedural Fiel a Kahoot ──
  // 1. Lobby: 120 BPM, marimba saltarina, woodblock sutil, bajo pizzicato (¡CERO TAMBORES!)
  private tickLobby(time: number, step: number) {
    const beat16 = step % 16;
    const phrase32 = step % 32;

    // Tictac de woodblock suave en los pulsos del reloj
    if (beat16 === 4 || beat16 === 12) {
      this.playWoodblock(time, 1150, 0.06);
    } else if (beat16 === 8 || beat16 === 14) {
      this.playWoodblock(time, 920, 0.04);
    }

    // Melodía clásica de marimba inspirada en el Lobby Theme de Kahoot
    // Notas: C4 (261.63), D4 (293.66), F4 (349.23), G4 (392.0), A4 (440.0), C5 (523.25)
    const melodyPattern: Record<number, number> = {
      0: 261.63,  // C4
      2: 293.66,  // D4
      4: 293.66,  // D4
      6: 261.63,  // C4
      8: 293.66,  // D4
      10: 392.00, // G4
      12: 440.00, // A4
      14: 349.23, // F4
      16: 293.66, // D4
      18: 349.23, // F4
      20: 392.00, // G4
      22: 293.66, // D4
      24: 261.63, // C4
      26: 293.66, // D4
      28: 392.00, // G4
      30: 523.25, // C5
    };

    if (melodyPattern[phrase32]) {
      this.playMarimba(melodyPattern[phrase32], time, 0.12, 0.17);
    }

    // Bajo pizzicato ligero en los tiempos fuertes
    if (beat16 === 0) {
      this.playPizzicatoBass(146.83, time, 0.22, 0.22); // D3
    } else if (beat16 === 8) {
      this.playPizzicatoBass(130.81, time, 0.2, 0.18);  // C3
    } else if (beat16 === 12) {
      this.playPizzicatoBass(174.61, time, 0.18, 0.16); // F3
    }
  }

  // 2. Question: 124 BPM, cuenta regresiva estilo Kahoot con tictac de madera y marimba en staccato
  private tickQuestion(time: number, step: number) {
    const beat16 = step % 16;
    const phrase16 = step % 32;

    // Tictac de woodblock continuo marcando la urgencia del tiempo sin tambores retumbantes
    if (beat16 % 2 === 0) {
      const isDownbeat = beat16 % 4 === 0;
      this.playWoodblock(time, isDownbeat ? 1200 : 960, isDownbeat ? 0.08 : 0.045);
    }

    // Motivo de marimba staccato de Kahoot: D - F - E - D, Eb - D - Eb
    const questionMelody: Record<number, number> = {
      0: 587.33,  // D5
      2: 698.46,  // F5
      4: 659.25,  // E5
      6: 587.33,  // D5
      8: 622.25,  // Eb5 (el salto cromático característico)
      10: 587.33, // D5
      12: 622.25, // Eb5
      14: 698.46, // F5
      16: 587.33, // D5
      18: 523.25, // C5
      20: 587.33, // D5
      22: 783.99, // G5
      24: 880.00, // A5
      26: 783.99, // G5
      28: 698.46, // F5
      30: 587.33, // D5
    };

    if (questionMelody[phrase16]) {
      this.playMarimba(questionMelody[phrase16], time, 0.09, 0.18);
    }

    // Bajo de soporte ligero en contratiempo
    if (beat16 === 2 || beat16 === 10) {
      this.playPizzicatoBass(146.83, time, 0.14, 0.15); // D3
    } else if (beat16 === 6 || beat16 === 14) {
      this.playPizzicatoBass(116.54, time, 0.14, 0.14); // Bb2
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

  // ── Síntesis de Voz "AXEL'S PLAY" en Inglés Nativo Alegre (Web Speech API) ──
  public speakAxelsPlay() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Texto con entonación de show en inglés nativo
      const utterance = new SpeechSynthesisUtterance("Axel's Play!");
      utterance.pitch = 1.15;
      utterance.rate = 0.95;
      utterance.volume = 1;
      utterance.lang = 'en-US';

      const findBestEnglishVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return null;
        // Priorizar voces naturales en inglés (US / GB)
        return (
          voices.find((v) => v.lang === 'en-US' && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))) ||
          voices.find((v) => v.lang === 'en-US') ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0]
        );
      };

      const selectedVoice = findBestEnglishVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        window.speechSynthesis.speak(utterance);
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          const voice = findBestEnglishVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          }
          window.speechSynthesis.speak(utterance);
        };
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            window.speechSynthesis.speak(utterance);
          }
        }, 400);
      }
    } catch {
      // Ignorar si Web Speech API no está soportada en el navegador
    }
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
