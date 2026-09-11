import { describe, expect, it } from 'vitest';
import {
  validateOvalContainment,
  isSpatialContinuityValid,
  buildMatchEvent,
  KIOSK_OVAL_ROI,
} from '@/features/asistencias/scanner/scannerHelpers';

describe('Scanner Helpers: Oval Containment & Spatial Continuity', () => {
  const vWidth = 1280;
  const vHeight = 720;

  it('valida rostro correctamente centrado y con tamaño proporcional en el óvalo', () => {
    // Rostro centrado (x: 540, y: 210, w: 200, h: 300)
    // centerXR = 640 / 1280 = 0.50, centerYR = 360 / 720 = 0.50, heightRatio = 300 / 720 ~ 0.416
    const box = { x: 540, y: 210, width: 200, height: 300 };
    const result = validateOvalContainment(box, vWidth, vHeight);

    expect(result.isInsideOval).toBe(true);
    expect(result.distanceStatus).toBe('centered');
    expect(result.instructionText).toBe('Parpadee frente a la cámara');
  });

  it('detecta rostro demasiado alejado (heightRatio < 0.20) y lo descarta como no detectado', () => {
    // Rostro muy pequeño (h: 100 / 720 = 0.138)
    const box = { x: 590, y: 310, width: 100, height: 100 };
    const result = validateOvalContainment(box, vWidth, vHeight);

    expect(result.isInsideOval).toBe(false);
    expect(result.distanceStatus).toBe('not_detected');
    expect(result.instructionText).toBe('Ubique su rostro dentro del óvalo');
  });

  it('detecta rostro demasiado cerca (heightRatio > 0.80) y lo descarta', () => {
    // Rostro que desborda la lente (h: 650 / 720 = 0.902)
    const box = { x: 340, y: 35, width: 600, height: 650 };
    const result = validateOvalContainment(box, vWidth, vHeight);

    expect(result.isInsideOval).toBe(false);
    expect(result.distanceStatus).toBe('not_detected');
    expect(result.instructionText).toBe('Ubique su rostro dentro del óvalo');
  });

  it('descarta completamente cualquier rostro fuera de la elipse del óvalo (ej. a los lados)', () => {
    // Rostro en la esquina superior izquierda
    const box = { x: 50, y: 50, width: 200, height: 250 };
    const result = validateOvalContainment(box, vWidth, vHeight);

    expect(result.isInsideOval).toBe(false);
    expect(result.distanceStatus).toBe('not_detected');
    expect(result.instructionText).toBe('Ubique su rostro dentro del óvalo');
  });

  it('permite movimientos suaves entre fotogramas consecutivos (continuidad espacial válida)', () => {
    const last = { x: 640, y: 360 };
    const current = { x: 660, y: 370 }; // Desplazamiento de ~22px
    expect(isSpatialContinuityValid(current, last, vWidth)).toBe(true);
  });

  it('descarta saltos bruscos (ej. quitar rostro y colocar dedo en otra posición)', () => {
    const last = { x: 640, y: 360 };
    const current = { x: 150, y: 150 }; // Salto enorme > 30% del ancho
    expect(isSpatialContinuityValid(current, last, vWidth)).toBe(false);
  });

  it('acepta el primer fotograma cuando no hay posición previa (last: null)', () => {
    const current = { x: 640, y: 360 };
    expect(isSpatialContinuityValid(current, null, vWidth)).toBe(true);
  });
});

describe('Scanner Helpers: buildMatchEvent', () => {
  const students = [
    { id: 'std-1', name: 'Francisco Gómez' },
    { id: 'std-2', name: 'María Rodríguez' },
  ];

  it('construye evento de nueva asistencia cuando el alumno no estaba registrado', () => {
    const alreadyRegistered = new Set<string>();
    const res = buildMatchEvent('std-1', students, alreadyRegistered, 0.88);

    expect(res.isAlready).toBe(false);
    expect(res.studentName).toBe('Francisco Gómez');
    expect(res.matchEvent.studentId).toBe('std-1');
    expect(res.matchEvent.isAlreadyRegistered).toBe(false);
    expect(res.matchEvent.score).toBe(0.88);
  });

  it('construye evento indicando que el alumno ya fue registrado', () => {
    const alreadyRegistered = new Set<string>(['std-1']);
    const res = buildMatchEvent('std-1', students, alreadyRegistered, 0.92);

    expect(res.isAlready).toBe(true);
    expect(res.studentName).toBe('Francisco Gómez');
    expect(res.matchEvent.isAlreadyRegistered).toBe(true);
  });

  it('asigna nombre por defecto si el ID no se encuentra en la lista', () => {
    const alreadyRegistered = new Set<string>();
    const res = buildMatchEvent('std-99', students, alreadyRegistered, 0.75);

    expect(res.studentName).toBe('Estudiante');
    expect(res.isAlready).toBe(false);
  });
});

describe('Scanner Helpers: KIOSK_OVAL_ROI', () => {
  it('define una región central que aísla el óvalo y descarta la periferia', () => {
    expect(KIOSK_OVAL_ROI.xMin).toBe(0.25);
    expect(KIOSK_OVAL_ROI.xMax).toBe(0.75);
    expect(KIOSK_OVAL_ROI.yMin).toBe(0.10);
    expect(KIOSK_OVAL_ROI.yMax).toBe(0.88);
  });
});

