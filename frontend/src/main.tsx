import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AgendaProvider } from './context/AgendaContext';
import { ThemeProvider } from './context/ThemeContext';
import { UnreadProvider } from './context/UnreadContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <UnreadProvider>
            <AgendaProvider>
              <App />
            </AgendaProvider>
          </UnreadProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
