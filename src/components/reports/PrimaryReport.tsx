import React from 'react';

// This is a placeholder for the existing Primary Report logic
// so we can demonstrate the routing based on grade.
// In your real setup, you might plug your existing PDF generator or component here.

export interface PrimaryReportProps {
  studentName: string;
  grade: string;
}

export const PrimaryReport: React.FC<PrimaryReportProps> = ({ studentName, grade }) => {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1e3a8a' }}>BOLETÍN DE BÁSICA PRIMARIA</h2>
      <p>Este es el formato existente de primaria con notas numéricas.</p>
      <ul>
        <li><strong>Estudiante:</strong> {studentName}</li>
        <li><strong>Grado:</strong> {grade}</li>
      </ul>
      <div style={{ padding: '15px', backgroundColor: '#f5f5f5', border: '1px dashed #666' }}>
        <em>(Aquí renderiza la tabla con los promedios y P1, P2, P3, P4)</em>
      </div>
    </div>
  );
};

export default PrimaryReport;
