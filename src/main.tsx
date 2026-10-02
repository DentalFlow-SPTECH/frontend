import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { DemoProvider } from './demo/store';
import { router } from './app/routes';
import './style/font.css';
import './style/tokens.css';
import './style/reset.css';
createRoot(document.getElementById('root')!).render(<StrictMode><DemoProvider><RouterProvider router={router} /></DemoProvider></StrictMode>);
