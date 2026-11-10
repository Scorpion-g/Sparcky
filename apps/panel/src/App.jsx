import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Guild from "./pages/Guild"
import DevDb from "./pages/DevDb"
import Terms from "./pages/Terms"
import Privacy from "./pages/Privacy"
import ProtectedRoute from "./components/ProtectedRoute"
import { LanguageProvider } from "./lib/i18n"

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/guild/:id" element={<Guild />} />
            <Route path="/dev-db" element={<DevDb />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  )
}
