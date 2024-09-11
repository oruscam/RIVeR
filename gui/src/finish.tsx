import React from 'react';
import { createRoot } from 'react-dom/client'; // Importa createRoot desde react-dom/client
import { FinishModalWindow } from './pages';
import './finish.css'; // Asegúrate de que el nombre del archivo CSS sea correcto
import { Provider } from 'react-redux';
import store from './store/store';

const container = document.getElementById('root');
const root = createRoot(container!); // Usa createRoot para crear un root

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <FinishModalWindow />
    </Provider>
  </React.StrictMode>
);