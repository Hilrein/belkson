import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './HomePage'
import AdminPage from './admin/AdminPage'
import { CatalogProvider } from './store/CatalogContext'
import { CartProvider } from './store/CartContext'

function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </CatalogProvider>
  )
}

export default App
