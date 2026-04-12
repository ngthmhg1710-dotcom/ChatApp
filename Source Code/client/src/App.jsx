// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login          from './pages/Login';
import Register       from './pages/Register';
import Chat           from './pages/Chat';
import Friends        from './pages/Friends';
import SearchUsers    from './pages/SearchUsers';
import Profile        from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import AdminReports   from './pages/AdminReports';
import CallRoom       from './pages/CallRoom';
import DirectCallRoom from './pages/DirectCallRoom';
import { useAuthStore } from './store/authStore';

function CallRouteGate() {
  const [searchParams] = useSearchParams();
  return searchParams.get('group') === '1' ? <CallRoom /> : <DirectCallRoom />;
}

function App() {
  const { user } = useAuthStore();

  const PrivateRoute = ({ children }) =>
    user ? children : <Navigate to="/login" />;

  const PublicRoute = ({ children }) =>
    !user ? children : <Navigate to="/chat" />;

  const AdminRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    if (!['admin', 'moderator'].includes(user.role || 'user')) return <Navigate to="/chat" />;
    return children;
  };

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route path="/chat"     element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/friends"  element={<PrivateRoute><Friends /></PrivateRoute>} />
        <Route path="/search"   element={<PrivateRoute><SearchUsers /></PrivateRoute>} />
        <Route path="/profile"  element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* ── Call Room — standalone page, survive reload ── */}
        <Route
          path="/call/:callId"
          element={<PrivateRoute><CallRouteGate /></PrivateRoute>}
        />

        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/" element={<Navigate to={user ? '/chat' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
