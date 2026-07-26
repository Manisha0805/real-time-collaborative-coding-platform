import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { socket } from "../../Services/socket";

function EditorLogic() {
  const typingTimeout = useRef(null);
  const bannerTimeout = useRef(null);

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { username, language: initialLanguage } = location.state || {};

  // =========================
  // States
  // =========================

const [code, setCode] = useState(() => {
  return localStorage.getItem(`code-${roomId}`) || "";
});

  const [language, setLanguage] = useState(
    initialLanguage?.toLowerCase() || "cpp"
  );

  const [theme, setTheme] =useState("vs-dark");

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  // Chat Notification
  const [chatBanner, setChatBanner] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
    

    socket.off("receive-code");
    socket.off("users-update");
    socket.off("receive-message");
    socket.off("typing");
    socket.off("receive-language");

    socket.emit("join-room", {
      roomId,
      username,
    });

    // Code Sync
    socket.on("receive-code", (newCode) => {
      setCode(newCode);
    });

    // Users
    socket.on("users-update", (updatedUsers) => {
      setUsers(updatedUsers);
    });

    // Chat
    socket.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);

      if (!isChatOpen) {
        setUnreadCount((prev) => prev + 1);
        setChatBanner(message);

        if (bannerTimeout.current) {
          clearTimeout(bannerTimeout.current);
        }

        bannerTimeout.current = setTimeout(() => {
          setChatBanner(null);
        }, 3000);
      }
      
    });

    // Typing
    socket.on("typing", (user) => {
      setTypingUser(user);

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        setTypingUser("");
      }, 1500);
    });

    // Language
    socket.on("receive-language", (lang) => {
      setLanguage(lang);
    });

    return () => {
      socket.emit("leave-room", { roomId });

      socket.off("receive-code");
      socket.off("users-update");
      socket.off("receive-message");
      socket.off("typing");
      socket.off("receive-language");

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      if (bannerTimeout.current) {
        clearTimeout(bannerTimeout.current);
      }
    };
  }, [roomId, username, navigate, isChatOpen]);
  
  useEffect(() => {
  if (!roomId) return;

  localStorage.setItem(`code-${roomId}`, code);
}, [code, roomId]);

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
  // Editor
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
      javascript: "javascript",
      python: "python3",
      cpp: "cpp17",
      c: "c",
      java: "java",
      php: "php",
    };

    try {
      const response = await fetch("http://localhost:5000/api/code/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: languageMap[language],
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOutput(data.error || "Execution Failed");
        return;
      }

      setOutput(data.output || "No Output");
    } catch (err) {
      setOutput(err.message);
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
  // Battle
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
  // Leave
  // =========================

  const handleLeave = () => {
    socket.emit("leave-room", { roomId });
    navigate("/");
  };

  // =========================
  // Export
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

    chatBanner,
    unreadCount,
    isChatOpen,

    setTheme,
    setIsChatOpen,
    setUnreadCount,

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