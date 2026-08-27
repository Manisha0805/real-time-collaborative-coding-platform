import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./Pages/Home";
import EditorPage from "./Pages/EditorPage";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Main */}
        <Route path="/" element={<Home />} />

        {/* Editor */}
        <Route
          path="/editor/:roomId"
          element={<EditorPage />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;