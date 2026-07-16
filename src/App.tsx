import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import StorefrontLayout from './components/StorefrontLayout'
import HomePage from './HomePage'
import CatalogPage from './CatalogPage'
import AdminPage from './admin/AdminPage'
import { CatalogProvider } from './store/CatalogContext'
import { CartProvider } from './store/CartContext'

function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Storefront pages inherit shared navbar / footer / cart */}
            <Route element={<StorefrontLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              {/* Future shop pages: nest under StorefrontLayout */}
            </Route>

            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </CatalogProvider>
  )
}

export default App
