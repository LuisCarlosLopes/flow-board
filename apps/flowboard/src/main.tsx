import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeToDocument, readTheme } from './infrastructure/theme/themeStore'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'

applyThemeToDocument(readTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
