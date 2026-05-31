import { useParams, useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useEffect, useState } from "react";

const socket = io("http://localhost:5000", { autoConnect: false });

function EditorPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { username, language: initialLanguage } = location.state || {
    username: "Guest",
    language: "javascript",
  };

  const [code, setCode] = useState("// Start coding...");
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [language, setLanguage] = useState(initialLanguage);
  const [theme, setTheme] = useState("vs-dark");
  const [typingUser, setTypingUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [output, setOutput] = useState("Run your code...");

  useEffect(() => {
    socket.connect();
    setConnected(true);

    socket.off("receive-code");
    socket.off("update-users");
    socket.off("user-joined");
    socket.off("user-left");
    socket.off("typing");
    socket.off("receive-message");

    socket.emit("join-room", { roomId, username });

    socket.on("receive-code", (newCode) => setCode(newCode));
    socket.on("update-users", setUsers);
    socket.on("user-joined", (user) =>
      setNotifications((prev) => [...prev, `${user} joined`])
    );
    socket.on("user-left", (user) =>
      setNotifications((prev) => [...prev, `${user} left`])
    );
    socket.on("typing", (user) => {
      setTypingUser(user);
      setTimeout(() => setTypingUser(""), 1500);
    });
    socket.on("receive-message", (data) =>
      setMessages((prev) => [...prev, data])
    );

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [roomId, username]);

  const handleCodeChange = (value = "") => {
    setCode(value);
    socket.emit("code-change", { roomId, code: value });
    socket.emit("typing", { roomId, username });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied!");
  };

  const leaveRoom = () => {
    socket.disconnect();
    navigate("/");
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const data = { username, text: message };
    socket.emit("send-message", { roomId, data });
    setMessages((prev) => [...prev, data]);
    setMessage("");
  };

  const runCode = async () => {
    setOutput("Running...");
    const languageMap = {
      javascript: "nodejs",
      python: "python3",
      java: "java",
      cpp: "cpp17",
      c: "c",
      php: "php",
    };
    try {
      const response = await fetch("http://localhost:5000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: languageMap[language] }),
      });
      const data = await response.json();
      setOutput(data.output);
    } catch (error) {
      console.log(error);
      setOutput("Error running code");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      {/* 🔹 TOP BAR */}
      <header className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex flex-col mr-auto">
          <h1 className="text-base sm:text-lg font-bold">CodeSync 🚀</h1>
          <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[60vw]">
            Room: {roomId}
          </p>
        </div>

        <span className="text-xs sm:text-sm">
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </span>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-xs sm:text-sm truncate max-w-[40vw]">
            👤 {username}
          </span>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-700 px-2 py-1 rounded text-xs sm:text-sm"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="php">PHP</option>
          </select>

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-slate-700 px-2 py-1 rounded text-xs sm:text-sm"
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
            <option value="hc-black">High Contrast</option>
          </select>

          <button
            onClick={copyRoomId}
            className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs sm:text-sm"
          >
            Copy ID
          </button>
          <button
            onClick={runCode}
            className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs sm:text-sm"
          >
            Run
          </button>
          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-xs sm:text-sm"
          >
            Leave
          </button>
        </div>
      </header>

      {/* 🔹 MAIN — stacks on mobile, 3-col on lg */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] overflow-hidden">
        {/* LEFT PANEL */}
        <aside className="order-2 lg:order-1 bg-slate-800 border-t lg:border-t-0 lg:border-r border-slate-700 p-3 overflow-y-auto max-h-48 lg:max-h-none">
          <h2 className="font-semibold mb-2 text-sm">Active Users</h2>
          <ul className="space-y-1 mb-3">
            {users.map((user, i) => (
              <li key={i} className="text-sm">👤 {user}</li>
            ))}
          </ul>

          {typingUser && (
            <p className="text-xs text-slate-400 italic mb-2">
              ✍️ {typingUser} is typing...
            </p>
          )}

          <h3 className="font-semibold mb-2 text-sm">Notifications</h3>
          <ul className="space-y-1">
            {notifications.map((n, i) => (
              <li key={i} className="text-xs text-slate-300">{n}</li>
            ))}
          </ul>
        </aside>

        {/* CENTER */}
        <section className="order-1 lg:order-2 flex flex-col min-h-0">
          <div className="flex-1 min-h-[240px]">
            <Editor
              height="100%"
              language={language}
              theme={theme}
              value={code}
              onChange={(value) => handleCodeChange(value || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                smoothScrolling: true,
              }}
            />
          </div>

          <div className="bg-black/60 border-t border-slate-700 p-3 max-h-40 sm:max-h-56 overflow-auto">
            <h3 className="font-semibold mb-1 text-sm">Output</h3>
            <pre className="text-xs sm:text-sm whitespace-pre-wrap break-words">
              {output}
            </pre>
          </div>
        </section>

        {/* CHAT PANEL */}
        <aside className="order-3 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col max-h-72 lg:max-h-none">
          <div className="p-3 border-b border-slate-700">
            <h2 className="font-semibold text-sm">Team Chat 💬</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className="bg-slate-700 rounded px-2 py-1">
                <p className="text-xs font-semibold text-sky-300">
                  {msg.username}
                </p>
                <p className="text-sm break-words">{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 p-2 border-t border-slate-700">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type message..."
              className="flex-1 min-w-0 px-3 py-2 rounded bg-slate-700 outline-none text-sm"
            />
            <button
              onClick={sendMessage}
              className="bg-sky-600 hover:bg-sky-500 px-3 py-2 rounded text-sm"
            >
              Send
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default EditorPage;
