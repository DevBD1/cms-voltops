import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import CustomerApp from './pages/customer/CustomerApp';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import LoginAdmin from './pages/LoginAdmin';
import LoginCustomer from './pages/LoginCustomer';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginCustomer />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <CustomerApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERATOR', 'TECHNICIAN']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
