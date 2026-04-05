import React from 'react';
import PreescolarReport, { PreescolarReportProps } from './PreescolarReport';
import PrimaryReport from './PrimaryReport';

export interface ReportSystemProps {
  studentName: string;
  grade: string;
  // Payload for preescolar
  preescolarData?: Omit<PreescolarReportProps, 'student'>;
}

/**
 * Componente contenedor que decide qué boletín renderizar
 * según el grado escolar del estudiante.
 */
export const ReportSystemContainer: React.FC<ReportSystemProps> = ({ 
  studentName, 
  grade, 
  preescolarData 
}) => {
  
  // Normalizar el string para la comparación
  const normalizedGrade = grade.toLowerCase().trim();
  
  const isPreescolar = 
    normalizedGrade.includes('jardín') || 
    normalizedGrade.includes('jardin') || 
    normalizedGrade.includes('transición') || 
    normalizedGrade.includes('transicion') || 
    normalizedGrade.includes('párvulo') || 
    normalizedGrade.includes('parvulo') ||
    normalizedGrade.includes('pre-jardín') ||
    normalizedGrade.includes('preescolar');

  if (isPreescolar) {
    if (!preescolarData) {
      return <div>Faltan los datos cualitativos del nivel preescolar.</div>;
    }
    
    // Armar las props para Preescolar
    const studentInfo = {
      name: studentName,
      grade: grade,
      year: new Date().getFullYear().toString(),
      director: "Nombre del Director", // Esto podría venir por props también
    };

    return (
      <PreescolarReport 
        student={studentInfo}
        dimensions={preescolarData.dimensions}
        schoolInfo={preescolarData.schoolInfo}
      />
    );
  } else {
    // Si no es preescolar, renderizamos el de primaria existente
    return <PrimaryReport studentName={studentName} grade={grade} />;
  }
};

export default ReportSystemContainer;

// =====================================================================
// EJEMPLO DE USO CON DATOS MOCK
// =====================================================================

export const MockDemoReport: React.FC = () => {
  const mockSchoolInfo = {
    republic: 'REPÚBLICA DE COLOMBIA',
    ministry: 'MINISTERIO DE EDUCACIÓN NACIONAL',
    department: 'DEPARTAMENTO DEL MAGDALENA',
    city: 'Ciénaga, Magdalena',
    name: 'INSTITUCIÓN EDUCATIVA INSTITUTO PEDAGÓGICO ABC',
    logoUrl: '/logo-iabc.jpg', // Ruta relativa al public folder de Vite
  };

  const mockDimensions = [
    {
      dimension: 'DIMENSIÓN COGNITIVA',
      fortalezas: 'Reconoce colores primarios, arma rompecabezas de 10 piezas y muestra curiosidad por los números del 1 al 10.',
      debilidades: 'Se distrae con facilidad durante los ejercicios de clasificación larga.',
      recomendaciones: 'Reforzar en casa la concentración usando juegos de memoria por periodos de 5 minutos.'
    },
    {
      dimension: 'DIMENSIÓN SOCIOAFECTIVA, ESPIRITUAL Y ÉTICA',
      fortalezas: 'Comparte con sus compañeros, sigue instrucciones básicas y respeta a la docente.',
      debilidades: '',
      recomendaciones: 'Felicitar continuamente su buena actitud para fortalecer su autoestima.'
    },
    {
      dimension: 'DIMENSIÓN COMUNICATIVA',
      fortalezas: 'Expresa sus ideas de forma clara y responde a preguntas sencillas sobre un cuento que se le relata.',
      debilidades: 'Su pronunciación de la letra "R" aún está en proceso.',
      recomendaciones: 'Practicar trabalenguas sencillos en un ambiente de juego.'
    }
  ];

  return (
    <div style={{ backgroundColor: '#ccc', padding: '20px' }}>
      <h1>Sistema de Boletines (Demo)</h1>
      
      <h2>Caso 1: Preescolar (Jardín)</h2>
      <ReportSystemContainer 
        studentName="MARÍA JOSÉ PÉREZ GÓMEZ"
        grade="Jardín"
        preescolarData={{
          schoolInfo: mockSchoolInfo,
          dimensions: mockDimensions
        }}
      />
      
      <div style={{ height: '40px' }} />
      
      <h2>Caso 2: Básica Primaria (Tercero)</h2>
      <ReportSystemContainer 
        studentName="CARLOS ANDRÉS RAMÍREZ LÓPEZ"
        grade="Tercero"
      />
    </div>
  );
};
