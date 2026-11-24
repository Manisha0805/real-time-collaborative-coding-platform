import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./Pages/Home";
import EditorPage from "./Pages/EditorPage";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import ErrorBoundary from "./Components/ErrorBoundary";
import { getToken, isTokenValid, clearSession } from "./API/client";

// Pages that need a logged-in user redirect to /login otherwise
function RequireAuth({ children }) {
  if (!isTokenValid(getToken())) {
    clearSession();
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Main */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />

          {/* Editor */}
          <Route
            path="/editor/:roomId"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />

          {/* Unknown URLs */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
