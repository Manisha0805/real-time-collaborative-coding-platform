import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { socket } from "../../services/socket";

function EditorLogic() {
  const typingTimeout = useRef(null);

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { username, language: initialLanguage } = location.state || {};

  // =========================
  // States
  // =========================
  const [code, setCode] = useState("");

  const [language, setLanguage] = useState(
    initialLanguage?.toLowerCase() || "cpp"
  );

  const [theme, setTheme] = useState("vs-dark");

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const [battleMode, setBattleMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800);

  // =========================
  // Socket Connection
  // =========================
  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    socket.connect();

    socket.off("receive-code");
    socket.off("update-users");
    socket.off("receive-message");
    socket.off("typing");
    socket.off("receive-language");

    socket.emit("join-room", {
      roomId,
      username,
    });

    socket.on("receive-code", (newCode) => {
      setCode(newCode);
    });

    socket.on("update-users", (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("typing", (user) => {
      setTypingUser(user);

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        setTypingUser("");
      }, 1500);
    });

    socket.on("receive-language", (lang) => {
      setLanguage(lang);
    });

    return () => {
      socket.emit("leave-room", { roomId });

      socket.off("receive-code");
      socket.off("update-users");
      socket.off("receive-message");
      socket.off("typing");
      socket.off("receive-language");

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      socket.disconnect();
    };
  }, [roomId, username, navigate]);

  // =========================
  // Battle Timer
  // =========================
  useEffect(() => {
    if (!battleMode) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [battleMode]);
  // =========================
  // Editor Handlers
  // =========================

  const handleCodeChange = (value) => {
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

  const handleLanguageChange = (lang) => {
    setLanguage(lang);

    socket.emit("language-change", {
      roomId,
      language: lang,
    });
  };

  // =========================
  // Download
  // =========================

  const handleDownload = () => {
    const extensionMap = {
      javascript: "js",
      python: "py",
      java: "java",
      cpp: "cpp",
      c: "c",
      php: "php",
    };

    const blob = new Blob([code], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${extensionMap[language] || "txt"}`;
    a.click();

    URL.revokeObjectURL(url);
  };

  // =========================
  // Run Code
  // =========================

  const handleRun = async () => {
    setRunning(true);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language: languageMap[language],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute code");
      }

      const data = await response.json();

      setOutput(
        data.output ||
        data.error ||
        "No Output"
      );
    } catch (error) {
      console.error(error);
      setOutput("Error running code.");
    } finally {
      setRunning(false);
    }
  };

  // =========================
  // Chat
  // =========================

  const handleSendMessage = (text) => {
    const msg = {
      username,
      text,
    };

    socket.emit("send-message", {
      roomId,
      data: msg,
    });

    setMessages((prev) => [...prev, msg]);
  };

  const clearOutput = () => {
    setOutput("");
  };

  // =========================
  // Battle Mode
  // =========================

  const handleStartBattle = () => {
    setBattleMode(true);
    setTimeLeft(1800);
  };

  const handleEndBattle = () => {
    setBattleMode(false);
    setTimeLeft(1800);
  };

  // =========================
  // Leave Room
  // =========================

  const handleLeave = () => {
    socket.emit("leave-room", { roomId });
    navigate("/");
  };

  // =========================
  // Export Everything
  // =========================

  return {
    roomId,
    username,

    code,
    language,
    theme,
    users,
    messages,
    typingUser,
    output,
    running,
    battleMode,
    timeLeft,

    setTheme,

    handleCodeChange,
    handleLanguageChange,
    handleDownload,
    handleRun,
    handleSendMessage,
    clearOutput,
    handleStartBattle,
    handleEndBattle,
    handleLeave,
  };
}

export default EditorLogic;