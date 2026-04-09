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

const PDF_MARGIN_MM = 10;
const PDF_SECTION_GAP_MM = 2;

const getPrintableSections = (reportRoot: HTMLDivElement) => {
  return Array.from(reportRoot.children).flatMap((node) => {
    if (!(node instanceof HTMLElement)) {
      return [];
    }

    if (node.classList.contains('dimensions-container')) {
      return Array.from(node.querySelectorAll<HTMLElement>('.dimension-card'));
    }

    return [node];
  });
};

const addCanvasToPdf = (
  pdf: InstanceType<(typeof import('jspdf'))['default']>,
  canvas: HTMLCanvasElement,
  currentY: number,
) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN_MM * 2;
  const availableHeight = pageHeight - PDF_MARGIN_MM * 2;
  const mmPerPixel = contentWidth / canvas.width;
  const maxSliceHeightPx = Math.floor(availableHeight / mmPerPixel);

  let y = currentY;
  let offsetPx = 0;

  while (offsetPx < canvas.height) {
    if (y > PDF_MARGIN_MM && y >= pageHeight - PDF_MARGIN_MM) {
      pdf.addPage();
      y = PDF_MARGIN_MM;
    }

    const remainingHeightMm = pageHeight - PDF_MARGIN_MM - y;
    const remainingHeightPx = Math.floor(remainingHeightMm / mmPerPixel);
    const sliceHeightPx = Math.min(canvas.height - offsetPx, Math.max(remainingHeightPx, maxSliceHeightPx > 0 ? 1 : canvas.height));

    if (sliceHeightPx <= 0) {
      pdf.addPage();
      y = PDF_MARGIN_MM;
      continue;
    }

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;

    const context = sliceCanvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo crear el contexto del canvas para exportar el PDF.');
    }

    context.drawImage(
      canvas,
      0,
      offsetPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    const sliceHeightMm = sliceHeightPx * mmPerPixel;
    pdf.addImage(
      sliceCanvas.toDataURL('image/jpeg', 0.98),
      'JPEG',
      PDF_MARGIN_MM,
      y,
      contentWidth,
      sliceHeightMm,
    );

    offsetPx += sliceHeightPx;
    y += sliceHeightMm;

    if (offsetPx < canvas.height) {
      pdf.addPage();
      y = PDF_MARGIN_MM;
    } else {
      y += PDF_SECTION_GAP_MM;
    }
  }

  return y;
};

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

  // Export sections directly with html2canvas + jsPDF to keep the bundle lean.
  const handleExportPDF = async () => {
    const element = reportRef.current;
    if (!element) return;

    const [{ default: html2canvas }, { default: JsPdf }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const pdf = new JsPdf({
      format: 'letter',
      orientation: 'portrait',
      unit: 'mm',
    });

    let currentY = PDF_MARGIN_MM;
    const sections = getPrintableSections(element);

    for (const section of sections) {
      const canvas = await html2canvas(section, {
        backgroundColor: '#ffffff',
        logging: false,
        scale: 2,
        useCORS: true,
      });

      currentY = addCanvasToPdf(pdf, canvas, currentY);
    }

    pdf.save(`Boletin_${student.name.replace(/\s+/g, '_')}_Preescolar.pdf`);
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
