import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { IpcRenderer } from 'electron';
import { App } from './App';
import store from './store/store';
import './index.css';
import './translations/i18n';
import React from 'react';


createRoot(document.getElementById('root') ?? document.createElement('div')).render(
  // <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  // </React.StrictMode>
);

// Use contextBridge
declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
  }
}

window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message);
});
