import { WizardButtons } from '../components'
import { Bathimetry, Velocity } from '../components/Graphs'
import { ProcessedRange, VideoInfo } from '../components/Report'
import { Header } from '../components/Report/Header'
import './pages.css'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { ReportSection } from '../components/Report/ReportSection'

export const Report = () => {
    const handleDownloadPDF = () => {
        // const input = document.getElementById('report'); 
        // // Specify the id of the element you want to convert to PDF
        // if(input){
        //     console.log(input)
        //     html2canvas(input).then((canvas) => {
        //       const imgData = canvas.toDataURL('image/png');
        //       console.log(imgData)
        //       const pdf = new jsPDF();
        //       pdf.addImage(imgData, 'PNG', 0, 0);
        //       pdf.save('sample-pdf-report.pdf'); 
        //       // Specify the name of the downloaded PDF file
        //     });
        // }
        window.ipcRenderer.send('print-to-pdf', 'args')
      };



    const generatePDF = () => {
        const input = document.getElementById('report-pdf');
    
        if (input) {
            html2canvas(input).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4', compress: true, precision: 4 });
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save('report.pdf');
            });
        }
    };

  return (
    <div className='report-container'>
        <button id='download-button' onClick={generatePDF}>Save</button>
        <div className='page' id='report-pdf'>
            <Header/>
            <VideoInfo/>
            <ProcessedRange/>
            <h2 className="report-title-field mt-2"> Cross Sections (s)</h2>
            <ReportSection/>
        </div>

          <WizardButtons></WizardButtons>
    </div>
  )
}
