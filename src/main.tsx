import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'; // ถ้าไฟล์ชื่อ tailwind.css ต้องพิมพ์แบบนี้
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)