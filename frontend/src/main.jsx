import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { PRIMARY, ACCENT, COLLEGE_NAME } from './config';
import './styles.css';

document.documentElement.style.setProperty('--p', PRIMARY);
document.documentElement.style.setProperty('--a', ACCENT);
document.title = COLLEGE_NAME;

createRoot(document.getElementById('root')).render(<App />);
