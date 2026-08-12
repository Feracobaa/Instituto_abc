import { useState, useRef, useCallback } from 'react';
import { EnrollmentStep } from '../types';
import {
  computeCentroidEmbedding,
  validateIntraClassDispersion,
} from '../services/vectorMath';
import {
  detectFaceWithLandmarks,
} from '../services/faceDetector';
import {
  calculateHeadPoseYaw,
} from '../services/livenessDetector';
import { voiceFeedback } from '@/utils/voiceFeedback';
import { toast } from 'sonner';

export const ENROLLMENT_STEP_CONFIG: Record<
  'frontal' | 'left' | 'right',
  { title: string; subtitle: string; voicePrompt: string }
> = {
  frontal: {
    title: 'Paso 1/3: Rostro Frontal',
    subtitle: 'Mire de frente al centro de la cámara',
    voicePrompt: 'Paso uno. Mire de frente a la cámara.',
  },
  left: {
    title: 'Paso 2/3: Giro a la Izquierda',
    subtitle: 'Gire suavemente la cabeza hacia su izquierda (15°)',
    voicePrompt: 'Paso dos. Gire suavemente la cabeza a la izquierda.',
  },
  right: {
    title: 'Paso 3/3: Giro a la Derecha',
    subtitle: 'Gire suavemente la cabeza hacia su derecha (15°)',
    voicePrompt: 'Paso tres. Gire suavemente la cabeza a la derecha.',
  },
};

export function useBiometricEnrollment(personName?: string) {
  const [step, setStep] = useState<EnrollmentStep>('frontal');
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);
  const [stabilityProgress, setStabilityProgress] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string>(
    ENROLLMENT_STEP_CONFIG.frontal.subtitle
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const consecutiveStableFramesRef = useRef<number>(0);
  const sampleCooldownUntilRef = useRef<number>(0);
  const isCompletingRef = useRef<boolean>(false);

  const resetEnrollment = useCallback(() => {
    setStep('frontal');
    setCapturedSamples([]);
    setStabilityProgress(0);
    setFeedbackMessage(ENROLLMENT_STEP_CONFIG.frontal.subtitle);
    consecutiveStableFramesRef.current = 0;
    sampleCooldownUntilRef.current = 0;
    isCompletingRef.current = false;
  }, []);

  /**
   * Evalúa un fotograma de video y avanza en la máquina de estados de enrolamiento multi-ángulo
   */
  const processFrame = useCallback(
    async (
      video: HTMLVideoElement,
      onCompleteSave: (finalCentroid: number[]) => Promise<boolean>
    ): Promise<void> => {
      if (
        !video ||
        video.readyState < 2 ||
        isProcessing ||
        isCompletingRef.current ||
        step === 'complete' ||
        step === 'failed'
      ) {
        return;
      }

      if (Date.now() < sampleCooldownUntilRef.current) {
        return;
      }

      setIsProcessing(true);
      try {
        const detection = await detectFaceWithLandmarks(video);

        if (!detection) {
          consecutiveStableFramesRef.current = Math.max(0, consecutiveStableFramesRef.current - 1);
          setStabilityProgress(consecutiveStableFramesRef.current * 20);
          setFeedbackMessage('Rostro no detectado. Colóquese frente a la cámara');
          return;
        }

        const { landmarks, quality, embedding } = detection;
        const yawRatio = calculateHeadPoseYaw(landmarks);

        // Validar calidad básica
        if (quality.isBlurred && quality.blurScore && quality.blurScore < 30) {
          setFeedbackMessage('Imagen borrosa. Mantenga la cabeza firme');
          consecutiveStableFramesRef.current = 0;
          setStabilityProgress(0);
          return;
        }

        if (quality.isSpoof) {
          setFeedbackMessage('Calidad de imagen rechazada (posible pantalla)');
          return;
        }

        // Evaluar ángulo según el paso actual
        let isAngleValid = false;

        if (step === 'frontal') {
          // Frontal: 0.82 a 1.20
          isAngleValid = yawRatio >= 0.82 && yawRatio <= 1.20;
          if (!isAngleValid) {
            setFeedbackMessage('Mire directamente al centro de la cámara');
          }
        } else if (step === 'left') {
          // Giro Izquierda: < 0.75
          isAngleValid = yawRatio < 0.75;
          if (!isAngleValid) {
            setFeedbackMessage('Gire un poco más la cabeza a la izquierda');
          }
        } else if (step === 'right') {
          // Giro Derecha: > 1.35
          isAngleValid = yawRatio > 1.35;
          if (!isAngleValid) {
            setFeedbackMessage('Gire un poco más la cabeza a la derecha');
          }
        }

        if (isAngleValid) {
          consecutiveStableFramesRef.current += 1;
          const progress = Math.min(100, consecutiveStableFramesRef.current * 25);
          setStabilityProgress(progress);
          setFeedbackMessage('¡Posición perfecta! Manténgase quieto...');

          // Si mantiene la postura por 4 cuadros consecutivos (~150ms)
          if (consecutiveStableFramesRef.current >= 4) {
            consecutiveStableFramesRef.current = 0;
            setStabilityProgress(0);
            sampleCooldownUntilRef.current = Date.now() + 1200; // 1.2s de cooldown

            const updatedSamples = [...capturedSamples, embedding];
            setCapturedSamples(updatedSamples);
            voiceFeedback.playSound('success');

            if (step === 'frontal') {
              setStep('left');
              setFeedbackMessage(ENROLLMENT_STEP_CONFIG.left.subtitle);
              toast.success('Muestra 1/3 capturada (Frontal)');
              voiceFeedback.speak(ENROLLMENT_STEP_CONFIG.left.voicePrompt, 'normal');
            } else if (step === 'left') {
              setStep('right');
              setFeedbackMessage(ENROLLMENT_STEP_CONFIG.right.subtitle);
              toast.success('Muestra 2/3 capturada (Izquierda)');
              voiceFeedback.speak(ENROLLMENT_STEP_CONFIG.right.voicePrompt, 'normal');
            } else if (step === 'right') {
              // 3 muestras capturadas: Validar dispersión intra-clase
              isCompletingRef.current = true;
              setStep('complete');
              setFeedbackMessage('Verificando coherencia biométrica y guardando...');

              const dispersion = validateIntraClassDispersion(updatedSamples, 0.45);
              if (!dispersion.isValid) {
                console.warn('Dispersión intra-clase excedida:', dispersion.maxPairwiseDistance);
                toast.error('Muestras discordantes detectadas. Reiniciando registro por seguridad.');
                resetEnrollment();
                return;
              }

              const centroid = computeCentroidEmbedding(updatedSamples);
              const success = await onCompleteSave(centroid);

              if (success) {
                toast.success('¡Registro biométrico completado con éxito!');
                if (personName) {
                  voiceFeedback.notifySuccess(personName);
                }
              } else {
                setStep('failed');
                setFeedbackMessage('Error al guardar en el servidor. Reintente.');
              }
            }
          }
        } else {
          consecutiveStableFramesRef.current = Math.max(0, consecutiveStableFramesRef.current - 1);
          setStabilityProgress(consecutiveStableFramesRef.current * 25);
        }
      } catch (err) {
        console.warn('Error en ciclo de enrolamiento:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [capturedSamples, isProcessing, personName, resetEnrollment, step]
  );

  return {
    step,
    capturedSamples,
    stabilityProgress,
    feedbackMessage,
    processFrame,
    resetEnrollment,
  };
}
