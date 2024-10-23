import { Progress, WizardButtons } from '../components'
import { ProcessedRange, VideoInfo, ReportSection, Header, Summary, PixelTransformation, ProcessingParameters, Footer } from '../components/Report'
import './pages.css'
import { useDataSlice, useSectionSlice } from '../hooks'
import { FormLastSettings } from '../components/Forms/FormLastSettings';

const convertImageToDataURI = ( url: string ) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const dataURI = canvas.toDataURL('image/png');
      resolve(dataURI);
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const Report = () => {
  const { sections } = useSectionSlice();
  const { onSetAnalizing } = useDataSlice();

  const generateHTML = async () => {
    onSetAnalizing(true)
    const input = document.getElementById('report-html-container');
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
    onSetAnalizing(false)

  };

  return (
    <div className='regular-page'>
      <div className='media-container'>
        <div id='report-html-page'>
            <div id='report-html-container'>
                <Header/>
                <VideoInfo/>
                <ProcessedRange/>
                <div id='report-section-wrapper'> 
                  <h2 className="report-title-field mt-1" > Cross Sections (s)</h2>
                  {
                    [...sections.keys()].map(index => (
                    index === 0 ? null : <ReportSection key={index} index={index} />
                    ))
                  }
                </div>
                <Summary/>
                <PixelTransformation/>
                <ProcessingParameters/>
                <Footer/>
            </div>
        </div>
      </div>
      <div className='form-container'>
        <Progress/>
        <FormLastSettings></FormLastSettings>
        <WizardButtons onClickNext={generateHTML}></WizardButtons>
      </div>
    </div>
  )
}
