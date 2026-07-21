import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [isJoin, setIsJoin] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = () => {
    if (!username.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (isJoin && !roomId.trim()) {
      setError("Please enter the Room ID.");
      return;
    }

    setError("");

    const id = isJoin
      ? roomId.trim().toUpperCase()
      : generateRoomId();

    navigate(`/editor/${id}`, {
      state: {
        username: username.trim(),
        language,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl p-8">

        <h1 className="text-4xl font-bold text-center text-cyan-400">
          💻 CodeSync
        </h1>

        <p className="text-center text-slate-400 mt-2 mb-6">
          Real-Time Collaborative Coding Platform
        </p>

        <div className="grid grid-cols-2 gap-2 text-sm text-slate-300 mb-6">
          <div>⚡ Live Collaboration</div>
          <div>💬 Team Chat</div>
          <div>▶ Run Code</div>
          <div>👥 Multi User</div>
        </div>

        <input
          type="text"
          placeholder="Enter your name"
          value={username}
          maxLength={25}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        <div className="flex rounded-xl overflow-hidden mb-4 border border-slate-700">

          <button
            onClick={() => {
              setIsJoin(false);
              setError("");
            }}
            className={`flex-1 py-3 transition ${
              !isJoin
                ? "bg-cyan-500 text-black font-semibold"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            Create Room
          </button>

          <button
            onClick={() => {
              setIsJoin(true);
              setError("");
            }}
            className={`flex-1 py-3 transition ${
              isJoin
                ? "bg-cyan-500 text-black font-semibold"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            Join Room
          </button>

        </div>

        {isJoin && (
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            maxLength={6}
            onChange={(e) =>
              setRoomId(
                e.target.value
                  .replace(/\s/g, "")
                  .toUpperCase()
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        )}

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="php">PHP</option>
        </select>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={
            !username.trim() ||
            (isJoin && !roomId.trim())
          }
          className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
        >
          {isJoin ? "Join Room" : "Create Room"}
        </button>

        <p className="text-center text-slate-500 text-xs mt-6">
          Powered by React • Socket.IO • Monaco Editor
        </p>

      </div>

    </div>
  );
}

export default Home;