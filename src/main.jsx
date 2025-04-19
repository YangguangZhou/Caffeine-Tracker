import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CaffeineTracker from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CaffeineTracker />
  </StrictMode>,
)
