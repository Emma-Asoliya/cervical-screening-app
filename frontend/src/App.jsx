import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Result from './pages/Result'
import History from './pages/History'
import About from './pages/About'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="about" element={<About />} />
        <Route path="/results/:imageId" element={<Result />} />
        <Route path="history" element={<History />} />
        <Route path="*" element={<NotFound />} />
        </Route>
    </Routes>
  )
}

export default App