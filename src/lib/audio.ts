// ============================================================
// AXEL PLAY - Motor de Audio Profesional Completo
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

  // ── Primitivas de Sonido Sintético ──
  private playKick(time: number, vol = 0.4) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(this.masterMusicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playHiHat(time: number, vol = 0.08) {
    if (!this.ctx || !this.masterMusicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.035;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);
    noise.start(time);
  }

  private playBass(freq: number, time: number, duration = 0.2, vol = 0.25) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterMusicGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playSynthNote(freq: number, time: number, duration = 0.16, type: OscillatorType = 'triangle', vol = 0.12) {
    if (!this.ctx || !this.masterMusicGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(gain);
    gain.connect(this.masterMusicGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  // ── Secuenciadores de Música Procedural ──
  // 1. Lobby: 124 BPM, alegre, juguetón, estilo Kahoot
  private tickLobby(time: number, step: number) {
    // 16 pasos por ciclo (4 compases de 4 tiempos)
    const beat16 = step % 16;
    const chordIndex = Math.floor((step % 64) / 16); // C, G, Am, F

    // Batería rítmica
    if (beat16 === 0 || beat16 === 8) {
      this.playKick(time, 0.35);
    }
    if (beat16 % 2 === 1 || beat16 === 4 || beat16 === 12) {
      this.playHiHat(time, 0.09);
    }

    // Línea de Bajo
    const bassNotes = [130.81, 98.0, 110.0, 87.31]; // C3, G2, A2, F2
    const currentBass = bassNotes[chordIndex];
    if (beat16 === 0 || beat16 === 6 || beat16 === 10 || beat16 === 14) {
      this.playBass(currentBass, time, 0.22, 0.28);
    }

    // Melodía / Arpegio alegre
    const arpeggios = [
      [261.63, 329.63, 392.0, 523.25], // C - E - G - C
      [196.0, 246.94, 293.66, 392.0],  // G - B - D - G
      [220.0, 261.63, 329.63, 440.0],  // A - C - E - A
      [174.61, 220.0, 261.63, 349.23], // F - A - C - F
    ];
    const notes = arpeggios[chordIndex];
    if (beat16 % 2 === 0) {
      const note = notes[(beat16 / 2) % notes.length];
      this.playSynthNote(note, time, 0.14, 'triangle', 0.11);
    }
  }

  // 2. Question: 136 BPM, tenso, enérgico, de cuenta regresiva
  private tickQuestion(time: number, step: number) {
    const beat16 = step % 16;
    const chordIndex = Math.floor((step % 32) / 16); // Dm, Bb

    // Kick intenso 4-on-the-floor
    if (beat16 % 4 === 0) {
      this.playKick(time, 0.45);
    }
    this.playHiHat(time, beat16 % 4 === 2 ? 0.12 : 0.06);

    // Bajo pulsante en semicorcheas continuas (estilo trance/arcade)
    const dBass = chordIndex === 0 ? 146.83 : 116.54; // D3 o Bb2
    this.playBass(dBass, time, 0.11, 0.26);

    // Tics de reloj y stabs de tensión
    if (beat16 === 4 || beat16 === 12) {
      this.playSynthNote(587.33, time, 0.1, 'sawtooth', 0.14); // D5
    } else if (beat16 === 14) {
      this.playSynthNote(659.25, time, 0.08, 'square', 0.12); // E5
    }
  }

  // 3. Podium: 128 BPM, grandioso, triunfal, fanfarria de campeones
  private tickPodium(time: number, step: number) {
    const beat16 = step % 16;
    const chordIndex = Math.floor((step % 32) / 8);

    if (beat16 === 0 || beat16 === 6 || beat16 === 10) {
      this.playKick(time, 0.4);
    }
    this.playHiHat(time, 0.1);

    // Acordes alegres de triunfo
    const fanfareChords = [
      [523.25, 659.25, 783.99], // C mayor
      [587.33, 739.99, 880.0],  // D mayor
      [659.25, 830.61, 987.77], // E mayor
      [783.99, 987.77, 1174.66],// G mayor
    ];
    const currentChord = fanfareChords[chordIndex % fanfareChords.length];

    if (beat16 % 4 === 0) {
      currentChord.forEach((f) => {
        this.playSynthNote(f, time, 0.22, 'triangle', 0.12);
      });
      this.playBass(currentChord[0] / 2, time, 0.3, 0.3);
    }
  }

  // 4. Suspense: 96 BPM, oscuro, tensión psicológica, acordes menores y latidos
  private tickSuspense(time: number, step: number) {
    const beat16 = step % 16;
    const chordIndex = Math.floor((step % 32) / 16);

    // Latido cardiaco (doble golpe bajo suave)
    if (beat16 === 0) {
      this.playKick(time, 0.38);
    } else if (beat16 === 2) {
      this.playKick(time, 0.25);
    }

    // HiHat sutil y misterioso
    if (beat16 === 8 || beat16 === 12) {
      this.playHiHat(time, 0.04);
    }

    // Bajo oscuro en F# o E
    const suspenseBass = chordIndex === 0 ? 92.5 : 82.41;
    if (beat16 === 0 || beat16 === 6) {
      this.playBass(suspenseBass, time, 0.35, 0.32);
    }

    // Notas de suspenso disonantes
    if (beat16 === 4) {
      this.playSynthNote(369.99, time, 0.3, 'sawtooth', 0.1);
    } else if (beat16 === 10) {
      this.playSynthNote(392.0, time, 0.35, 'triangle', 0.12);
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

  public playIntroFanfare() {
    const chord = [392, 523.25, 659.25, 783.99];
    chord.forEach((f) => this.playEffectTone(f, 'triangle', 0.6, 0.3));
  }
}

// ── Motor de Audio Global de AXEL'S PLAY ──
class AudioEngine {
  private synth = new MusicSynthesizer();
  private settings: AudioSettings = {
    musicEnabled: true,
    effectsEnabled: true,
    musicVolume: 0.75,
    effectsVolume: 0.85,
  };

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
    this.synth.setMusicVolume(this.settings.musicEnabled ? this.settings.musicVolume : 0);
    this.synth.setSfxVolume(this.settings.effectsEnabled ? this.settings.effectsVolume : 0);
  }

  private saveSettings() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('axelplay_audio', JSON.stringify(this.settings));
  }

  public unlock() {
    this.synth.unlockContext();
  }

  public playMusic(track: 'lobby' | 'question' | 'suspense' | 'podium') {
    if (!this.settings.musicEnabled) return;
    this.synth.startMusic(track);
  }

  public stopMusic() {
    this.synth.stopMusic();
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
      case 'sfx_intro':
        this.synth.playIntroFanfare();
        break;
      default:
        this.synth.playTick();
        break;
    }
  }

  public setContext(context: AudioSceneContext | 'intro' | 'suspense') {
    switch (context) {
      case 'intro':
        this.playEffect('sfx_intro');
        setTimeout(() => this.playMusic('lobby'), 400);
        break;
      case 'suspense':
        this.playMusic('suspense');
        break;
      case 'lobby':
        this.playMusic('lobby');
        break;
      case 'game_start':
        this.synth.playEffectTone(392, 'square', 0.2, 0.25);
        setTimeout(() => this.playMusic('question'), 400);
        break;
      case 'question':
        this.playMusic('question');
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
      case 'podium':
        this.playMusic('podium');
        break;
      case 'power_up':
        this.playEffect('sfx_power_up');
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
    }
    this.saveSettings();
  }

  public setEffectsEnabled(enabled: boolean) {
    this.settings.effectsEnabled = enabled;
    this.synth.setSfxVolume(enabled ? this.settings.effectsVolume : 0);
    this.saveSettings();
  }

  public setMusicVolume(vol: number) {
    this.settings.musicVolume = vol;
    if (this.settings.musicEnabled) {
      this.synth.setMusicVolume(vol);
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
