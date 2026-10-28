import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './app/app_provider.jsx';
import { router } from './app/routes.jsx';
import { ToastProvider } from './component/ui/index.js';
import './style/font.css';
import './style/tokens.css';
import './style/reset.css';

createRoot(document.getElementById('root')).render(<StrictMode><AppProvider><ToastProvider><RouterProvider router={router}/></ToastProvider></AppProvider></StrictMode>);
