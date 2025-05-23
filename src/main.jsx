import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CaffeineTracker from './CaffeineTracker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CaffeineTracker />
  </StrictMode>,
)