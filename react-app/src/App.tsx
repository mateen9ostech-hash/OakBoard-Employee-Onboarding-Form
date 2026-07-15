import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthRoute } from './lib/AuthRoute'
import { FillDetailsPage } from './pages/FillDetailsPage'
import { GenerateFormPage } from './pages/GenerateFormPage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/fill-details" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/fill-details"
        element={
          <AuthRoute>
            <FillDetailsPage />
          </AuthRoute>
        }
      />
      <Route
        path="/generate-form"
        element={
          <AuthRoute>
            <GenerateFormPage />
          </AuthRoute>
        }
      />
      <Route path="*" element={<Navigate to="/fill-details" replace />} />
    </Routes>
  )
}
