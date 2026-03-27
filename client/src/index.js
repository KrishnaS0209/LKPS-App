import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LandingPage from './LandingPage';

const path = window.location.pathname;

// Simple client-side routing: / → landing, /login → app
const root = ReactDOM.createRoot(document.getElementById('root'));

if (path === '/' || path === '') {
  root.render(<React.StrictMode><LandingPage /></React.StrictMode>);
} else {
  // /login or anything else → main app
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
