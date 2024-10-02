import { WizardButtons } from '../components'
import { ProcessedRange, VideoInfo } from '../components/Report'
import { Header } from '../components/Report/Header'
import './pages.css'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { ReportSection } from '../components/Report/ReportSection'

const convertImageToDataURI = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURI = canvas.toDataURL('image/png');
      resolve(dataURI);
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const Report = () => {
  const generatePDF = () => {
    const input = document.getElementById('report-pdf');

    if (input) {
        html2canvas(input).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            console.log(imgData)
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

  // const generateHTML = () => {
  //   const input = document.getElementById('report-pdf');
  //   if (input) {
  //     const htmlContent = `
  //       <!DOCTYPE html>
  //       <html lang="en">
  //       <head>
  //         <meta charset="UTF-8">
  //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //         <title>Report</title>
  //         <link rel="stylesheet" href="/src/components/Report/report.css">
  //         <style>
  //           ${Array.from(document.styleSheets)
  //             .map(styleSheet => {
  //               try {
  //                 return Array.from(styleSheet.cssRules)
  //                   .map(rule => rule.cssText)
  //                   .join('');
  //               } catch (e) {
  //                 console.error(e);
  //                 return '';
  //               }
  //             })
  //             .join('')}
  //         </style>
  //       </head>
  //       <body>
  //         ${input.outerHTML}
  //       </body>
  //       </html>
  //     `;
  //     const blob = new Blob([htmlContent], { type: 'text/html' });
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'report.html';
  //     a.click();
  //   }
  // };
  const generateHTML = async () => {
    const input = document.getElementById('report-pdf');
    if (input) {
      // Convert all images to data URIs
      const images = Array.from(input.getElementsByTagName('img'));
      const imagePromises = images.map(img => convertImageToDataURI(img.src));
      const imageDataURIs = await Promise.all(imagePromises);
  
      // Replace image sources with data URIs
      images.forEach((img, index) => {
        img.src = imageDataURIs[index] as string;
      });
  
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Report</title>
          <link rel="stylesheet" href="/src/components/Report/report.css">
          <style>
            ${Array.from(document.styleSheets)
              .map(styleSheet => {
                try {
                  return Array.from(styleSheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('');
                } catch (e) {
                  console.error(e);
                  return '';
                }
              })
              .join('')}
          </style>
        </head>
        <body>
          ${input.outerHTML}
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.html';
      a.click();
    }
  };



  return (
    <div className='report-container'>
        <button id='download-button' onClick={generatePDF}>Save as PDF</button>
        <button id='download-html-button' onClick={generateHTML}>Save as HTML</button>

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
