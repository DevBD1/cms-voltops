import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <main className="app">
      <h1>VoltOps Web</h1>
      <p>React app inside a Turbo monorepo.</p>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
