import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { IpcRenderer, WebUtils } from 'electron';
import { App } from './App';
import store from './store/store';
import './index.css';
import './translations/i18n';

createRoot(document.getElementById('root') ?? document.createElement('div')).render(
  <Provider store={store}>
    <App />
  </Provider>
);

// Use contextBridge
declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
    webUtils: WebUtils;
  }
}

window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message);
});
