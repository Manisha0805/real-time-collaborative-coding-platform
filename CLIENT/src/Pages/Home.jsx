import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isJoin, setIsJoin] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!username.trim()) {
      setError("Name is required");
      return;
    }

    if (isJoin && !roomId.trim()) {
      setError("Room ID is required");
      return;
    }

    setError("");

    const id = isJoin
      ? roomId
      : Date.now().toString(36);

    navigate(`/editor/${id}`, {
      state: {
        username,
        language,
      },
    });
  };

  return (
 <div className="min-h-screen flex items-center justify-center bg-black text-white">

    <div className="backdrop-blur-lg bg-white/10 border border-white/20 p-8 rounded-2xl shadow-2xl w-96">

      <h1 className="text-4xl font-bold text-center mb-2 text-cyan-400">
        CodeSync 🚀
      </h1>

      <p className="text-center text-gray-300 mb-6">
        Real-time collaborative platform
      </p>

        {/* Username */}
        <input
          type="text"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded-lg bg-black/40 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />

        {/* Toggle Buttons */}
        <div className="flex mb-4 bg-black/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsJoin(false)}
            className={`flex-1 py-2 ${
              !isJoin ? "bg-cyan-500 text-black font-semibold" : "text-white"
            }`}
          >
            Create
          </button>

          <button
            onClick={() => setIsJoin(true)}
            className={`flex-1 py-2 ${
              isJoin ? "bg-cyan-500 text-black font-semibold" : "text-white"
            }`}
          >
            Join
          </button>
        </div>

        {/* Room ID (only for Join) */}
        {isJoin && (
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded-lg bg-black/40 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        )}

        {/* Language Dropdown */}
       <select
  value={language}
  onChange={(e) => setLanguage(e.target.value)}
  className="w-full mb-4 px-4 py-2 rounded-lg bg-black/40 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
>
  <option value="javascript">JavaScript</option>

  <option value="cpp">C++</option>

  <option value="c">C</option>

  <option value="python">Python</option>

  <option value="java">Java</option>

  <option value="php">PHP</option>

  <option value="html">HTML</option>

  <option value="css">CSS</option>

  <option value="typescript">TypeScript</option>

  <option value="json">JSON</option>
</select>

        {/* Error Message */}
        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-cyan-500 py-2 rounded-lg hover:bg-cyan-600 transition font-semibold"
        >
          {isJoin ? "Join Room" : "Create Room"}
        </button>

      </div>
    </div>
  );
}

export default Home;