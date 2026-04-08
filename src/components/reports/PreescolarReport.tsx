import React, { useRef, forwardRef, useImperativeHandle } from 'react';
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
  period: string;
  deliveryDate: string;
}

export interface SchoolInfo {
  republic: string;
  ministry: string;
  department: string;
  city: string;
  name: string;
  address: string;
  phoneNit: string;
  logoUrl: string | null;
}

export interface PreescolarReportProps {
  student: StudentInfo;
  dimensions: DimensionData[]; // Database evaluations
  schoolInfo: SchoolInfo;
  id?: string;
}

export interface PreescolarReportHandle {
  exportPDF: () => Promise<void>;
}

export const PreescolarReport = forwardRef<PreescolarReportHandle, PreescolarReportProps>(({
  student,
  dimensions,
  schoolInfo,
  id = 'preescolar-report-content'
}, ref) => {
  const reportRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    exportPDF: async () => {
      await handleExportPDF();
    }
  }));

  // Global function attached to window for external triggering if needed
  // Since we're asked to provide an optimized html2pdf export.
  const handleExportPDF = async () => {
    const element = reportRef.current;
    if (!element) return;
    
    const html2pdf = (await import('html2pdf.js')).default;
    
    const opt = {
      margin:       10, // Margins in mm
      filename:     `Boletin_${student.name.replace(/\s+/g, '_')}_Preescolar.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' as const },
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
            <h3>{schoolInfo.name}</h3>
            <h4 style={{ fontWeight: 'normal', fontSize: '9px', marginTop: '2px' }}>{schoolInfo.address}</h4>
            <h4 style={{ fontWeight: 'normal', fontSize: '9px' }}>{schoolInfo.phoneNit}</h4>
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
              <span className="info-label">PERÍODO:</span>
              <span className="info-value">{student.period}</span>
            </div>
            <div className="info-item">
              <span className="info-label">AÑO LECTIVO:</span>
              <span className="info-value">{student.year}</span>
            </div>
          </div>
          <div className="info-row" style={{ marginBottom: 0 }}>
            <div className="info-item">
              <span className="info-label">FECHA ENTREGA:</span>
              <span className="info-value">{student.deliveryDate}</span>
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
            
            // Generate a clean filename key from the dimension name
            const imgKey = dimString.toLowerCase().replace(/[^a-z]/g, '');
            // You can drop these images into the public folder (e.g. public/dim_corporal.png)
            const iconPath = `/icons/dim_${imgKey}.png`;

            return (
              <div key={index} className="dimension-card">
                <div className="dimension-title">{dimString}</div>
                
                <div className="dimension-body">
                  <div className="dimension-icon">
                    <img 
                       src={iconPath} 
                       alt={dimString} 
                       className="dimension-img" 
                       crossOrigin="anonymous"
                       onError={(e) => {
                          // Hide broken image icon if file doesn't exist yet
                          (e.target as HTMLImageElement).style.display = 'none';
                       }}
                    />
                  </div>
                  <div className="dimension-content">
                    {evaluation ? (
                    <>
                      {evaluation.fortalezas && evaluation.fortalezas.trim() !== '' && (
                        <div className="dimension-section">
                          <strong>FORTALEZAS:</strong>
                          <p>{evaluation.fortalezas}</p>
                        </div>
                      )}
                      {evaluation.debilidades && evaluation.debilidades.trim() !== '' && (
                        <div className="dimension-section">
                          <strong>DEBILIDADES:</strong>
                          <p>{evaluation.debilidades}</p>
                        </div>
                      )}
                      {evaluation.recomendaciones && evaluation.recomendaciones.trim() !== '' && (
                        <div className="dimension-section">
                          <strong>RECOMENDACIONES:</strong>
                          <p>{evaluation.recomendaciones}</p>
                        </div>
                      )}
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
              </div>
            );
          })}
        </div>

        {/* SIGNATURES SECTION */}
        <div className="signatures" style={{ pageBreakInside: 'avoid', marginTop: '10px', paddingBottom: '10px' }}>
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
      <div style={{ textAlign: 'center', margin: '20px auto', maxWidth: '300px' }} className="print-hidden">
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); handleExportPDF(); }}
          style={{ padding: '10px 20px', backgroundColor: '#1e3a8a', color: 'white', borderRadius: '5px', cursor: 'pointer', border: 'none', width: '100%' }}
        >
          Exportar PDF Preescolar
        </button>
      </div>
    </div>
  );
});

export default PreescolarReport;
