/**
 * Módulo de síntesis de voz y efectos de sonido para el reconocimiento facial
 */

class VoiceFeedbackService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;

  /**
   * Enuncia un mensaje en español utilizando la Web Speech API
   */
  public speak(text: string, priority: 'high' | 'normal' = 'normal') {
    if (!this.synth) return;

    const now = Date.now();

    // Evitar hablar lo mismo o reiniciar locuciones si han pasado menos de 1000ms
    if (this.lastSpokenText === text && (now - this.lastSpokenTime) < 1500) {
      return;
    }

    if ((now - this.lastSpokenTime) < 700 && priority !== 'high') {
      return;
    }

    try {
      this.lastSpokenText = text;
      this.lastSpokenTime = now;

      if (this.synth.speaking) {
        this.synth.cancel(); // Cancelar locución previa activa
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05; // Velocidad ligeramente ágil
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Buscar voz en español si está disponible
      const voices = this.synth.getVoices();
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      this.synth.speak(utterance);
    } catch (e) {
      console.warn('No se pudo reproducir locución de voz:', e);
    }
  }

  /**
   * Reproduce un efecto de sonido sintético rápido usando Web Audio API
   */
  public playSound(type: 'success' | 'warning' | 'error' | 'already') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // Tono doble de éxito (Do5 -> Sol5)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'warning') {
        // Tono grave de advertencia
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(329.63, now); // E4
        osc.frequency.setValueAtTime(261.63, now + 0.12); // C4
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'already') {
        // Tono doble corto neutro
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(440, now + 0.12); // A4
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Error
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); // A3
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn('Error al reproducir audio Web API:', e);
    }
  }

  /**
   * Notifica el registro de asistencia exitoso por audio y voz
   */
  public notifySuccess(studentName: string) {
    this.playSound('success');
    this.speak(`Asistencia registrada exitosamente, ${studentName}`, 'high');
  }

  /**
   * Notifica que el estudiante ya tiene asistencia registrada
   */
  public notifyAlreadyMarked(studentName: string) {
    this.playSound('already');
    this.speak(`${studentName}, ya tienes asistencia registrada`, 'high');
  }

  /**
   * Notifica que el rostro no se reconoce en el sistema
   */
  public notifyUnrecognized() {
    this.playSound('warning');
    this.speak('Rostro no reconocido. Por favor verifique su registro', 'high');
  }
}

export const voiceFeedback = new VoiceFeedbackService();
