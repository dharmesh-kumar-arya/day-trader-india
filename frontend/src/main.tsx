import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Automatically route API requests to backend host when running inside Android APK (Capacitor)
const isCapacitor =
  (window as any).Capacitor !== undefined ||
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'file:' ||
  (window.location.hostname === 'localhost' && window.location.port !== '8000' && window.location.port !== '5173');

const defaultBackend = isCapacitor ? 'http://localhost:8000' : '';
const targetBackend = localStorage.getItem('dt_backend_url') || defaultBackend;

if (targetBackend) {
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = `${targetBackend}${input}`;
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

