import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import StartScreen from './components/StartScreen';
import DrawPage from './pages/DrawPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyDrawings from './pages/MyDrawings';
import DrawingDetails from './pages/DrawingDetails';

export default function App() {
  return (
    <AuthProvider>
      <div className="forest-viewport">
        {/* Large outer rounded frame */}
        <div className="outer-frame">
          <Navbar />
          <main className="frame-content">
            <Routes>
              <Route path="/" element={<StartScreen />} />
              <Route path="/draw" element={<DrawPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-drawings"
                element={
                  <ProtectedRoute>
                    <MyDrawings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drawings/:id"
                element={
                  <ProtectedRoute>
                    <DrawingDetails />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
