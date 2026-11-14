import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthProvider from './features/auth/context/AuthProvider';
import './styles.css';
import {checkOfflineReady} from './offline-ready';
const root=document.getElementById('root');if(!root)throw new Error('Không có root element');
ReactDOM.createRoot(root).render(<React.StrictMode><AuthProvider><App/></AuthProvider></React.StrictMode>);
if(import.meta.env.PROD&&'serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>void checkOfflineReady());window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').then(()=>checkOfflineReady()).catch(()=>checkOfflineReady())});if(navigator.serviceWorker.controller)void checkOfflineReady()}
