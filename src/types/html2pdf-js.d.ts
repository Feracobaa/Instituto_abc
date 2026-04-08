declare module "html2pdf.js" {
  export interface Html2PdfOptions {
    filename?: string;
    html2canvas?: {
      logging?: boolean;
      scale?: number;
      useCORS?: boolean;
    };
    image?: {
      quality?: number;
      type?: "jpeg" | "png" | "webp";
    };
    jsPDF?: {
      format?: string;
      orientation?: "landscape" | "portrait";
      unit?: string;
    };
    margin?: number;
    pagebreak?: {
      mode?: string[];
    };
  }

  export interface Html2PdfInstance {
    from(element: HTMLElement): Html2PdfInstance;
    save(): Promise<void>;
    set(options: Html2PdfOptions): Html2PdfInstance;
  }

  export interface Html2PdfFactory {
    (): Html2PdfInstance;
  }

  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}
