import riverLogo from '../../assets/logo_footer.png';
import githubLogo from '../../assets/github-mark.svg'

export const Footer = () => {
    let date = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    date = date.replace(',', '');

  return (
    <div id="report-footer-container">
        <div>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer">
                <img id="report-footer-river-logo" src={riverLogo} alt="Footer Logo" />
            </a>
        </div>
        <div>
            <p> Generated with RIVeR </p>
            <p> report creation date: { date } </p>
        </div>
        <div>
            <a href='https://github.com' target='_blank' rel='noopener noreferrer'>
                <img id='report-footer-github-logo' src={githubLogo} alt='Footer github logo'/>
                <span>RIVeR</span>
            </a>
        </div>
    </div>
  )
}
