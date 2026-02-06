import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'  // <--- MAKE SURE THIS SAYS './App.jsx'
import './styles/global.css' // Ensure this path is correct or comment it out for now

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)