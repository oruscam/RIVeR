import { WizardButtons } from '../components'
import { ProcessedRange, VideoInfo } from '../components/Report'
import { Header } from '../components/Report/Header'
import './pages.css'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { ReportSection } from '../components/Report/ReportSection'

export const Report = () => {
  const generatePDF = () => {
    const input = document.getElementById('report-pdf');

    if (input) {
        html2canvas(input).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4', compress: false, precision: 4 });
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            const pageHeight = pdf.internal.pageSize.getHeight();

            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('report.pdf');
        });
    }
  };

  // const generatePdf2 = () => {
  //   window.ipcRenderer.invoke('print-to-pdf', 'report.pdf');
  // }

  return (
    <div className='report-container'>
        <button id='download-button' onClick={generatePDF}>Save</button>
        <div className='page' id='report-pdf'>
            <Header/>
            <VideoInfo/>
            <ProcessedRange/>
            <h2 className="report-title-field mt-1"> Cross Sections (s)</h2>
            <ReportSection/>
        </div>

          <WizardButtons></WizardButtons>
    </div>
  )
}
