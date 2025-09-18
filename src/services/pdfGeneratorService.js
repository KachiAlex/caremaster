/**
 * PDF Generator Service
 * Generates PDF documents from HTML templates using browser's print functionality
 */

class PDFGeneratorService {
  constructor() {
    this.printOptions = {
      margin: '0.5in',
      format: 'A4',
      orientation: 'portrait',
      quality: 'high'
    };
  }

  /**
   * Generate PDF from HTML element using browser's print functionality
   */
  async generatePDF(elementId, filename, options = {}) {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID '${elementId}' not found`);
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please allow popups.');
      }

      // Get all stylesheets from the parent document
      const stylesheets = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            if (sheet.href) {
              return `<link rel="stylesheet" href="${sheet.href}">`;
            } else {
              // Inline styles
              const rules = Array.from(sheet.cssRules || sheet.rules || [])
                .map(rule => rule.cssText)
                .join('\n');
              return `<style>${rules}</style>`;
            }
          } catch (e) {
            // Handle CORS issues with external stylesheets
            if (sheet.href) {
              return `<link rel="stylesheet" href="${sheet.href}">`;
            }
            return '';
          }
        })
        .join('\n');

      // Create the HTML document for printing
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${stylesheets}
          <style>
            @media print {
              body { 
                margin: 0; 
                padding: 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.4;
                color: #000;
                background: white;
              }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              .avoid-break { page-break-inside: avoid; }
              
              /* Ensure good print quality */
              * { 
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              /* Hide download buttons in print */
              button, .btn { display: none !important; }
              
              /* Optimize table printing */
              table { 
                border-collapse: collapse; 
                width: 100%; 
              }
              
              /* Ensure backgrounds print */
              .bg-blue-600, .bg-green-600 { 
                background-color: #2563eb !important; 
                color: white !important;
              }
              .bg-gray-50, .bg-blue-50, .bg-green-50 { 
                background-color: #f9fafb !important; 
              }
            }
            
            @page {
              margin: 0.5in;
              size: A4;
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
          <script>
            window.onload = function() {
              // Auto-print when ready
              setTimeout(function() {
                window.print();
                // Close the window after printing
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
          </script>
        </body>
        </html>
      `;

      // Write content to the new window
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoiceData) {
    const filename = `ElderX_Invoice_${invoiceData.invoiceNumber}.pdf`;
    return this.generatePDF('invoice-template', filename);
  }

  /**
   * Generate prescription PDF
   */
  async generatePrescriptionPDF(prescriptionData) {
    const filename = `ElderX_Prescription_${prescriptionData.prescriptionNumber}.pdf`;
    return this.generatePDF('prescription-template', filename);
  }

  /**
   * Alternative method using data URLs (for modern browsers)
   */
  async downloadAsHTML(elementId, filename) {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID '${elementId}' not found`);
      }

      // Get all CSS styles
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || [])
              .map(rule => rule.cssText)
              .join('\n');
            return `<style>${rules}</style>`;
          } catch (e) {
            return '';
          }
        })
        .join('\n');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
          ${element.outerHTML}
        </body>
        </html>
      `;

      // Create download link
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error downloading HTML:', error);
      throw error;
    }
  }

  /**
   * Show print preview
   */
  showPrintPreview(elementId) {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID '${elementId}' not found`);
      }

      // Hide other elements temporarily
      const body = document.body;
      const originalContent = body.innerHTML;
      
      // Create print-only content
      body.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          ${element.outerHTML}
        </div>
      `;

      // Show print dialog
      window.print();

      // Restore original content
      body.innerHTML = originalContent;

      return true;
    } catch (error) {
      console.error('Error showing print preview:', error);
      throw error;
    }
  }

  /**
   * Check if browser supports PDF generation
   */
  isPDFSupported() {
    return typeof window !== 'undefined' && 
           typeof window.print === 'function' &&
           typeof document !== 'undefined';
  }

  /**
   * Get print-optimized styles
   */
  getPrintStyles() {
    return `
      @media print {
        body { 
          margin: 0; 
          padding: 20px;
          font-family: 'Arial', sans-serif;
          line-height: 1.4;
          color: #000;
          background: white;
        }
        
        .no-print, button, .btn { 
          display: none !important; 
        }
        
        .page-break { 
          page-break-before: always; 
        }
        
        .avoid-break { 
          page-break-inside: avoid; 
        }
        
        * { 
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        .bg-blue-600, .bg-green-600 { 
          background-color: #1e40af !important; 
          color: white !important;
        }
      }
      
      @page {
        margin: 0.5in;
        size: A4;
      }
    `;
  }
}

// Export singleton instance
export const pdfGeneratorService = new PDFGeneratorService();
export default pdfGeneratorService;
