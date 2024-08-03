import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { IpcRenderer } from 'electron';
import { App } from './App';
import store from './store/store';
import './index.css';
import './translations/i18n';

// ! STRICT MODE DESACTIVADO

createRoot(document.getElementById('root') ?? document.createElement('div')).render(
    <Provider store={store}>
      <App />
    </Provider>
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
