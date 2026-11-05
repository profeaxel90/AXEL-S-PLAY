// ============================================================
// AXEL PLAY - Motor de Audio Híbrido (Web Audio API + Howler.js)
// Generación de sonidos procedurales y soporte de audio en streaming
// ============================================================
import { Howl, Howler } from 'howler';
import type { AudioSceneContext, AudioSettings } from '../types';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generador de tono sintetizado limpio
  playTone(freq: number, type: OscillatorType, duration: number, gainVal = 0.2) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.debug('Synth tone error:', e);
    }
  }

  // Sonido de Acierto (Campanada positiva ascendente)
  playCorrect() {
    this.playTone(523.25, 'triangle', 0.15, 0.25); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.15, 0.25), 80); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.3, 0.3), 160); // G5
  }

  // Sonido de Error (Tono descendente suave)
  playIncorrect() {
    this.playTone(280, 'sawtooth', 0.2, 0.15);
    setTimeout(() => this.playTone(220, 'sawtooth', 0.3, 0.15), 120);
  }

  // Cuenta regresiva / Tic
  playCountdown() {
    this.playTone(880, 'sine', 0.08, 0.2);
  }

  // Tic suave del temporizador
  playTick() {
    this.playTone(600, 'sine', 0.04, 0.1);
  }

  // Fanfarria de Victoria / Podio
  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.3, 0.25), idx * 120);
    });
  }

  // Power Up obtenido o activado
  playPowerUp() {
    const notes = [440, 554.37, 659.25, 880, 1108.7];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.12, 0.2), idx * 60);
    });
  }

  // Jugador se une a la sala
  playJoin() {
    this.playTone(440, 'sine', 0.1, 0.15);
    setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.2), 90);
  }

  // Comienzo de partida
  playGameStart() {
    this.playTone(392, 'square', 0.15, 0.15);
    setTimeout(() => this.playTone(523.25, 'square', 0.2, 0.2), 120);
    setTimeout(() => this.playTone(783.99, 'square', 0.4, 0.25), 240);
  }

  // Sonido de desbloqueo (Escape Room)
  playUnlock() {
    this.playTone(659.25, 'sine', 0.15, 0.2);
    setTimeout(() => this.playTone(830.61, 'sine', 0.15, 0.2), 100);
    setTimeout(() => this.playTone(987.77, 'sine', 0.35, 0.25), 200);
  }
}

class AudioEngine {
  private sounds: Map<string, Howl> = new Map();
  private synth = new SoundSynthesizer();
  private currentMusic: Howl | null = null;
  private currentMusicKey: string | null = null;
  private settings: AudioSettings = {
    musicEnabled: true,
    effectsEnabled: true,
    musicVolume: 0.5,
    effectsVolume: 0.8,
  };
  private userInteracted = false;
  private pendingMusic: string | null = null;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      const handleInteraction = () => {
        this.userInteracted = true;
        if (this.pendingMusic) {
          this.playMusic(this.pendingMusic);
          this.pendingMusic = null;
        }
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
      };
      document.addEventListener('click', handleInteraction);
      document.addEventListener('keydown', handleInteraction);
      document.addEventListener('touchstart', handleInteraction);
    }
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
    Howler.volume(1);
  }

  private saveSettings() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('axelplay_audio', JSON.stringify(this.settings));
  }

  playMusic(key: string) {
    if (!this.settings.musicEnabled) return;
    if (!this.userInteracted) {
      this.pendingMusic = key;
      return;
    }
    if (this.currentMusicKey === key && this.currentMusic?.playing()) return;

    if (this.currentMusic && this.currentMusic.playing()) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, 800);
      setTimeout(() => this.currentMusic?.stop(), 800);
    }

    // Si no hay archivo cargado en desarrollo, se mantiene silencioso pero sin crashear
    this.currentMusicKey = key;
  }

  playEffect(key: string) {
    if (!this.settings.effectsEnabled) return;

    // Ejecutar efecto sintético instantáneo (cero latencia, 100% garantizado)
    switch (key) {
      case 'sfx_correct':
        this.synth.playCorrect();
        break;
      case 'sfx_incorrect':
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
        this.synth.playPowerUp();
        break;
      case 'sfx_join':
        this.synth.playJoin();
        break;
      case 'sfx_game_start':
        this.synth.playGameStart();
        break;
      case 'sfx_escape_unlock':
        this.synth.playUnlock();
        break;
      default:
        this.synth.playTick();
        break;
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
      this.currentMusicKey = null;
    }
  }

  setContext(context: AudioSceneContext) {
    switch (context) {
      case 'lobby':
        this.playMusic('music_lobby');
        break;
      case 'game_start':
        this.stopMusic();
        this.playEffect('sfx_game_start');
        break;
      case 'question':
        this.playMusic('music_question');
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
        this.stopMusic();
        this.playEffect('sfx_podium');
        break;
      case 'power_up':
        this.playEffect('sfx_power_up');
        break;
    }
  }

  setMusicEnabled(enabled: boolean) {
    this.settings.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    this.saveSettings();
  }

  setEffectsEnabled(enabled: boolean) {
    this.settings.effectsEnabled = enabled;
    this.saveSettings();
  }

  setMusicVolume(volume: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) this.currentMusic.volume(this.settings.musicVolume);
    this.saveSettings();
  }

  setEffectsVolume(volume: number) {
    this.settings.effectsVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  toggleMusic() {
    this.setMusicEnabled(!this.settings.musicEnabled);
  }

  toggleEffects() {
    this.setEffectsEnabled(!this.settings.effectsEnabled);
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
