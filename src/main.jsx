import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'; // 导入 HelmetProvider
import './index.css'
import CaffeineTracker from './CaffeineTracker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <CaffeineTracker />
    </HelmetProvider>
  </StrictMode>,
)