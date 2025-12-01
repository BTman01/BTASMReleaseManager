import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("index.tsx: Script start");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// With the @tauri-apps/api library, we no longer need to poll or wait.
// The library handles the initialization internally, making startup robust.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("index.tsx: React root rendered");