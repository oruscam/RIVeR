import { Bathimetry, Velocity } from '../components/Graphs'
import { ProcessedRange, VideoInfo } from '../components/Report'
import { Header } from '../components/Report/Header'
import './pages.css'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const Report = () => {
    const handleDownloadPDF = () => {
        const input = document.getElementById('report'); 
        // Specify the id of the element you want to convert to PDF
        if(input){
            console.log(input)
            html2canvas(input).then((canvas) => {
              const imgData = canvas.toDataURL('image/png');
              console.log(imgData)
              const pdf = new jsPDF();
              pdf.addImage(imgData, 'PNG', 0, 0);
              pdf.save('sample-pdf-report.pdf'); 
              // Specify the name of the downloaded PDF file
            });
        }
      };



    const generatePDF = () => {
        const input = document.getElementById('report-pdf');
    
        if (input) {
            html2canvas(input).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('portrait', 'px', 'a4');
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
            {/* <h1 className='mb-2'>Reporte V0.0.0</h1>
            <Bathimetry lineColor="black"/>
            <Velocity lineColor="black"></Velocity>
            <p id='text-report'> Lorem ipsum dolor sit amet consectetur adipisicing elit. Delectus nostrum laudantium officiis nihil in corporis, impedit aliquam magnam alias, cumque nulla tenetur rem tempore odio porro repellendus molestias aperiam illo! Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quos doloremque dolore atque delectus cum ipsam porro rem corporis quod. Nisi id nihil voluptas excepturi, in maxime fugit. Quam, expedita cumque.
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Delectus nostrum laudantium officiis nihil in corporis, impedit aliquam magnam alias, cumque nulla tenetur rem tempore odio porro repellendus molestias aperiam illo! Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quos doloremque dolore atque delectus cum ipsam porro rem corporis quod. Nisi id nihil voluptas excepturi, in maxime fugit. Quam, expedita cumque.
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Delectus nostrum laudantium officiis nihil in corporis, impedit aliquam magnam alias, cumque nulla tenetur rem tempore odio porro repellendus molestias aperiam illo! Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quos doloremque dolore atque delectus cum ipsam porro rem corporis quod. Nisi id nihil voluptas excepturi, in maxime fugit. Quam, expedita cumque.Lorem ipsum dolor sit amet consectetur adipisicing elit. Delectus nostrum laudantium officiis nihil in corporis, impedit aliquam magnam alias, cumque nulla tenetur rem tempore odio porro repellendus molestias aperiam illo! Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quos doloremque dolore atque delectus cum ipsam porro rem corporis quod. Nisi id nihil voluptas excepturi, in maxime fugit. Quam, expedita cumque.
            </p> */}
        </div>
    </div>
  )
}
