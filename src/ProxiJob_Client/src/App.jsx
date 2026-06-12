import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./homepage/Home";
import Login from "./auth/Login";
import Register from "./auth/Register";
import { useAuth } from "./auth/AuthContext";
import JobList from "./user/JobList";
import CreateWorkSchedule from "./user/CreateWorkSchedule";
import UserProfile from "./user/UserProfile";
import ViewProfile from "./user/ViewProfile";
function App() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Routes>
      <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
      <Route path="/joblist" element={<JobList />} />
      <Route
        path="createWorkSchedule"
        element={
          user ? <CreateWorkSchedule /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/view-profile"
        element={user ? <ViewProfile /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/profile"
        element={user ? <UserProfile /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
