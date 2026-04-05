import React, { useRef } from 'react';
import './PreescolarReport.css';
import { PREESCOLAR_DIMENSIONS } from '@/utils/constants';

export interface DimensionData {
  dimension: string;
  fortalezas: string;
  debilidades: string;
  recomendaciones: string;
}

export interface StudentInfo {
  name: string;
  grade: string;
  year: string;
  director: string;
}

export interface SchoolInfo {
  republic: string;
  ministry: string;
  department: string;
  city: string;
  name: string;
  logoUrl: string | null;
}

export interface PreescolarReportProps {
  student: StudentInfo;
  dimensions: DimensionData[]; // Database evaluations
  schoolInfo: SchoolInfo;
  id?: string;
}

export const PreescolarReport: React.FC<PreescolarReportProps> = ({
  student,
  dimensions,
  schoolInfo,
  id = 'preescolar-report-content'
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Global function attached to window for external triggering if needed
  // Since we're asked to provide an optimized html2pdf export.
  const handleExportPDF = async () => {
    const element = reportRef.current;
    if (!element) return;
    
    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default;
    
    const opt = {
      margin:       10, // Margins in mm
      filename:     `Boletin_${student.name.replace(/\s+/g, '_')}_Preescolar.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] } // Crucial for not cutting cards
    };
    
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div style={{ padding: '0 0 20px 0' }}>
      {/* Hidden container that has the HTML to be exported */}
      <div 
        className="report-wrapper" 
        id={id} 
        ref={reportRef}
        style={{ backgroundColor: 'white', color: 'black' }}
      >
        
        {/* HEADER SECTION */}
        <div className="report-header">
          {schoolInfo.logoUrl && (
            <div className="header-logo-left">
              <img src={schoolInfo.logoUrl} alt="Logo Izquierdo" className="header-logo-img" crossOrigin="anonymous" />
            </div>
          )}
          
          <div className="header-text">
            <h4>{schoolInfo.republic}</h4>
            <h4>{schoolInfo.ministry}</h4>
            <h4>{schoolInfo.department}</h4>
            <h4>{schoolInfo.city}</h4>
            <h3>{schoolInfo.name}</h3>
          </div>

          {schoolInfo.logoUrl && (
            <div className="header-logo-right">
              <img src={schoolInfo.logoUrl} alt="Logo Derecho" className="header-logo-img" crossOrigin="anonymous" />
            </div>
          )}
        </div>

        <div className="header-title-banner">
          BOLETÍN DE DESEMPEÑO CUALITATIVO — NIVEL PREESCOLAR
        </div>

        {/* STUDENT INFO SECTION */}
        <div className="student-info">
          <div className="info-row">
            <div className="info-item">
              <span className="info-label">ESTUDIANTE:</span>
              <span className="info-value">{student.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">GRADO:</span>
              <span className="info-value">{student.grade}</span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-item">
              <span className="info-label">AÑO LECTIVO:</span>
              <span className="info-value">{student.year}</span>
            </div>
            <div className="info-item">
              <span className="info-label">DIRECTOR(A):</span>
              <span className="info-value">{student.director}</span>
            </div>
          </div>
        </div>

        {/* DIMENSIONS: OBLIGATORY FIXED ORDER */}
        <div className="dimensions-container">
          {PREESCOLAR_DIMENSIONS.map((dimString, index) => {
            const evaluation = dimensions.find(d => d.dimension === dimString);
            
            return (
              <div key={index} className="dimension-card html2pdf__page-break">
                <div className="dimension-title">{dimString}</div>
                
                <div className="dimension-content">
                  {evaluation ? (
                    <>
                      <div className="dimension-section">
                        <strong>FORTALEZAS:</strong>
                        <p>{evaluation.fortalezas}</p>
                      </div>
                      <div className="dimension-section">
                        <strong>DEBILIDADES:</strong>
                        <p>{evaluation.debilidades}</p>
                      </div>
                      <div className="dimension-section">
                        <strong>RECOMENDACIONES:</strong>
                        <p>{evaluation.recomendaciones}</p>
                      </div>
                    </>
                  ) : (
                    <div className="dimension-section">
                      <p style={{ fontStyle: 'italic', color: '#666' }}>
                        Sin información registrada
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* SIGNATURES SECTION */}
        <div className="signatures html2pdf__page-break">
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">RECTOR(A)</div>
            <div className="signature-sub">Firma y Sello</div>
          </div>
          
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">DIRECTOR(A) DE GRUPO</div>
            <div className="signature-sub">Firma</div>
          </div>
          
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">ACUDIENTE</div>
            <div className="signature-sub">Firma y C.C.</div>
          </div>
        </div>

      </div>
      
      {/* Utility Button for isolated export (e.g. while testing) */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={handleExportPDF}
          style={{ padding: '10px 20px', backgroundColor: '#1e3a8a', color: 'white', borderRadius: '5px', cursor: 'pointer', border: 'none' }}
        >
          Exportar PDF Preescolar
        </button>
      </div>
    </div>
  );
};

export default PreescolarReport;
