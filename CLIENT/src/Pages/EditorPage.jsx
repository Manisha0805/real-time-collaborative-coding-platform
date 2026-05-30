import {
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Editor from "@monaco-editor/react";

import { io } from "socket.io-client";

import {
  useEffect,
  useState,
} from "react";

// ✅ SOCKET
const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function EditorPage() {
  const { roomId } = useParams();

  const location = useLocation();

  const navigate = useNavigate();

  const {
    username,
    language: initialLanguage,
  } = location.state || {
    username: "Guest",
    language: "javascript",
     };

  // 🔥 STATES
  const [code, setCode] = useState(
    "// Start coding..."
  );

  const [users, setUsers] = useState([]);

  const [notifications, setNotifications] =
    useState([]);

  const [language, setLanguage] =
    useState(initialLanguage);

  const [theme, setTheme] =
    useState("vs-dark");

  const [typingUser, setTypingUser] =
    useState("");
    const [connected, setConnected] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  const [output, setOutput] =
    useState("Run your code...");

  // 🔥 SOCKET SETUP
  useEffect(() => {
    socket.connect();

    setConnected(true);

    // CLEAN OLD LISTENERS
     socket.off("receive-code");
    socket.off("update-users");
    socket.off("user-joined");
    socket.off("user-left");
    socket.off("typing");
    socket.off("receive-message");

    // JOIN ROOM
    socket.emit("join-room", {
      roomId,
      username,
    });

    // RECEIVE CODE
   socket.on("receive-code", (newCode) => {
  setCode(newCode);
});

    // USERS
    socket.on("update-users", setUsers);
    // JOIN NOTIFICATION
    socket.on("user-joined", (user) => {
      setNotifications((prev) => [
        ...prev,
        `${user} joined`,
      ]);
    });

    // LEAVE NOTIFICATION
    socket.on("user-left", (user) => {
      setNotifications((prev) => [
        ...prev,
        `${user} left`,
      ]);
    });

    // TYPING
    socket.on("typing", (user) => {
      setTypingUser(user);
       setTimeout(() => {
        setTypingUser("");
      }, 1500);
    });

    // CHAT
    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.disconnect();

      setConnected(false);
    };
  }, [roomId, username]);

  // 🔥 CODE CHANGE
  const handleCodeChange = (value = "") => {
    setCode(value);

    socket.emit("code-change", {
       roomId,
      code: value,
    });

    socket.emit("typing", {
      roomId,
      username,
    });
  };

  // 🔥 COPY ROOM ID
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);

    alert("Room ID copied!");
  };

  // 🔥 LEAVE ROOM
  const leaveRoom = () => {
    socket.disconnect();

    navigate("/");
  };
   // 🔥 SEND CHAT
  const sendMessage = () => {
    if (!message.trim()) return;

    const data = {
      username,
      text: message,
    };

    socket.emit("send-message", {
      roomId,
      data,
    });

    setMessages((prev) => [...prev, data]);

    setMessage("");
  };

  // 🔥 RUN CODE (TEMPORARY)
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
    const response = await fetch(
      "http://localhost:5000/run",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          code: code,
          language:
            languageMap[language],
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    setOutput(data.output);

  } catch (error) {
    console.log(error);

    setOutput("Error running code");
  }
};
  return (
<div className="h-screen overflow-hidden flex flex-col bg-slate-900 text-white">      {/* 🔹 TOP BAR */}
<div className="flex flex-col lg:flex-row gap-4 lg:gap-0 justify-between lg:items-center px-4 lg:px-6 py-3">
        <div>
        <h2 className="text-cyan-400 font-bold text-lg lg:text-xl">
  CodeSync 🚀
      </h2>

          <p className="text-sm text-gray-400">
            Room: {roomId}
          </p>
           </div>

        {/* STATUS */}
        <div>
          {connected ? (
            <span className="text-green-400 text-sm">
              🟢 Connected
            </span>
          ) : (
            <span className="text-red-400 text-sm">
              🔴 Disconnected
            </span>
          )}
        </div>

        {/* CONTROLS */}
<div className="flex flex-wrap items-center gap-2">
          <span>
            👤 {username}
          </span>

          {/* LANGUAGE */}
           <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value)
            }
            className="bg-slate-700 px-2 py-1 rounded"
          >
            <option value="javascript">
              JavaScript
            </option>

            <option value="python">
              Python
            </option>

            <option value="java">
              Java
            </option>

            <option value="cpp">
              C++
            </option>

            <option value="c">
              C
            </option>
             <option value="php">
              PHP
            </option>
          </select>

          {/* THEME */}
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value)
            }
            className="bg-slate-700 px-2 py-1 rounded"
          >
            <option value="vs-dark">
              Dark
            </option>
             <option value="light">
              Light
            </option>

            <option value="hc-black">
              High Contrast
            </option>
          </select>

          {/* COPY */}
          <button
            onClick={copyRoomId}
            className="bg-cyan-500 px-3 py-1 rounded hover:hover:bg-cyan-600"
          >
            Copy ID
          </button>

          {/* RUN */}
          <button
            onClick={runCode}
            className="bg-green-500 px-3 lg:px-4 py-2 text-sm rounded  hover:hover:bg-green-700"
          >  Run</button>
          

          {/* LEAVE */}
          <button
            onClick={leaveRoom}
            className="bg-red-500 px-3 lg:px-4 py-2 text-smrounded  hover:hover:bg-red-800"
          >
            Leave
          </button>
        </div>
      </div>

      {/* 🔹 MAIN */}
<div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* 🔹 LEFT PANEL */}
<div className="w-full lg:w-64 bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-700 p-4 overflow-y-auto flex flex-col gap-4">          {/* USERS */}
          <h3 className="text-gray-400 mb-3">
            Active Users
             </h3>

          {users.map((user, index) => (
            <div
              key={user + index}
className="bg-slate-700 px-3 py-2 rounded-lg mb-2 text-sm break-words"            >
              👤 {user}
            </div>
          ))}

          {/* TYPING */}
          {typingUser && (
            <p className="text-cyan-400 text-sm mt-3">
              ✍️ {typingUser} is typing...
            </p>
          )}

          {/* NOTIFICATIONS */}
<div className="mt-4 bg-slate-700/50 p-3 rounded-xl">            <h3 className="text-gray-400 mb-2">
              Notifications
            </h3>
             {notifications.map((n, i) => (
              <div
                key={i}
className="bg-cyan-500/10 text-cyan-300 text-sm px-3 py-2 rounded-lg mb-2 border border-cyan-500/20"              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* 🔹 CENTER */}
        <div className="flex-1 flex flex-col">

          {/* EDITOR */}
<div className="flex-1 min-h-[300px]">      
        <Editor
              height="100%"
              language={language}
              value={code}
               theme={theme}
              onChange={(value) =>
                handleCodeChange(value || "")
              }
              options={{
                fontSize: 16,
                minimap: {
                  enabled: false,
                },
                automaticLayout: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                autoClosingBrackets:
                  "always",
                autoClosingQuotes:
                  "always",
                smoothScrolling: true,
              }}
            />
          </div>

          {/* OUTPUT */}
           <div className="h-40 lg:h-32 bg-black border-t border-slate-700 p-3 overflow-auto">
            <h3 className="text-green-400 mb-2">
              Output
            </h3>

            <pre className="text-sm text-gray-300">
              {output}
            </pre>
          </div>
        </div>

        {/* 🔹 CHAT PANEL */}
<div className="w-full lg:w-72 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col h-72 lg:h-auto">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-gray-300 font-semibold">
              Team Chat 💬
            </h3>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-3">
           {messages.map((msg, i) => (
              <div
                key={i}
                className="mb-3 bg-slate-700 p-2 rounded"
              >
                <strong>
                  {msg.username}
                </strong>

                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
               placeholder="Type message..."
              className="flex-1 min-w-0 px-3 py-2 rounded bg-slate-700 outline-none"
            />

            <button
              onClick={sendMessage}
              className="bg-cyan-500 px-3 rounded"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;