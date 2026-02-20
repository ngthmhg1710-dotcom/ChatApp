import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import { useAuthStore } from './store/authStore';

function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/chat" />} 
        />
        <Route 
          path="/register" 
          element={!user ? <Register /> : <Navigate to="/chat" />} 
        />
        <Route 
          path="/chat" 
          element={user ? <Chat /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? "/chat" : "/login"} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
