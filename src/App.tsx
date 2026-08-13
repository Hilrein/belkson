import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import StorefrontLayout from './components/StorefrontLayout'
import HomePage from './HomePage'
import CatalogPage from './CatalogPage'
import ExternalShopPage from './ExternalShopPage'
import ContactsPage from './ContactsPage'
import AdminPage from './admin/AdminPage'
import { CatalogProvider } from './store/CatalogContext'
import { CartProvider } from './store/CartContext'
import { DiscountsProvider } from './store/DiscountsContext'
import { OfficialStoresProvider } from './store/OfficialStoresContext'
import { PurchaseTermsProvider } from './store/PurchaseTermsContext'

import { OrdersProvider } from './store/OrdersContext'
import { MessengerSettingsProvider } from './store/MessengerSettingsContext'

import { HeroBannersProvider } from './store/HeroBannersContext'

function App() {
  return (
    <CatalogProvider>
      <DiscountsProvider>
        <CartProvider>
          <OfficialStoresProvider>
            <PurchaseTermsProvider>
              <HeroBannersProvider>
                <OrdersProvider>
                  <MessengerSettingsProvider>
                    <BrowserRouter>
                      <Routes>
                        {/* Storefront pages inherit shared navbar / footer / cart */}
                        <Route element={<StorefrontLayout />}>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/catalog" element={<CatalogPage />} />
                          <Route path="/contacts" element={<ContactsPage />} />
                          <Route path="/shop/:shop" element={<ExternalShopPage />} />
                          <Route path="/shop/:shop/:country" element={<ExternalShopPage />} />
                          {/* Future shop pages: nest under StorefrontLayout */}
                        </Route>

                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
                      </Routes>
                    </BrowserRouter>
                  </MessengerSettingsProvider>
                </OrdersProvider>
              </HeroBannersProvider>
            </PurchaseTermsProvider>
          </OfficialStoresProvider>
        </CartProvider>
      </DiscountsProvider>
    </CatalogProvider>
  )
}

export default App
