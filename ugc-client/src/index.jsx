import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import LandingPage from "./modules/landing/LandingPage.jsx";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        {/*<App />*/}
        <LandingPage />
    </React.StrictMode>
);