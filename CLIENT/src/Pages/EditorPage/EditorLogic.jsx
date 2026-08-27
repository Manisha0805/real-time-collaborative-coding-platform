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

  const [theme, setTheme] = useState("vs-dark");

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  // Chat
  const [chatBanner, setChatBanner] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Code execution
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  // Battle
  const [battleMode, setBattleMode] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [battleResult, setBattleResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(1800);

  // ============================================================
  // SOCKET CONNECTION + ROOM
  // ============================================================

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    // =========================
    // Join Room
    // =========================

    socket.emit("join-room", {
      roomId,
      username,
    });

    // =========================
    // Receive Code
    // =========================

    const handleReceiveCode = (newCode) => {
      setCode(newCode);
    };

    // =========================
    // Users Update
    // =========================

    const handleUsersUpdate = (updatedUsers) => {
      setUsers(updatedUsers);
    };

    // =========================
    // Receive Chat
    // =========================

    const handleReceiveMessage = (message) => {
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
    };

    // =========================
    // Typing
    // =========================

    const handleTyping = (user) => {
      setTypingUser(user);

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        setTypingUser("");
      }, 1500);
    };

    // =========================
    // Language
    // =========================

    const handleLanguage = (lang) => {
      setLanguage(lang);
    };

    // =========================
    // Register Listeners
    // =========================

    socket.on("receive-code", handleReceiveCode);
    socket.on("users-update", handleUsersUpdate);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("receive-language", handleLanguage);

    // =========================
    // Cleanup
    // =========================

    return () => {
      socket.emit("leave-room", {
        roomId,
      });

      socket.off("receive-code", handleReceiveCode);
      socket.off("users-update", handleUsersUpdate);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("receive-language", handleLanguage);

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      if (bannerTimeout.current) {
        clearTimeout(bannerTimeout.current);
      }

      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [roomId, username, navigate]);

  // ============================================================
  // BATTLE SOCKET LISTENERS
  // ============================================================

  useEffect(() => {
    if (!username) return;

    // =========================
    // Battle Started
    // =========================

    const handleBattleStarted = () => {
      console.log("⚔️ Battle Started");

      setBattleMode(true);
      setBattleResult(null);
      setTimeLeft(1800);
      setOutput("");
    };

    // =========================
    // Battle Result
    // =========================

    const handleBattleResult = ({ username: winner, accepted }) => {
      console.log("🏆 Battle Result:", {
        winner,
        accepted,
      });

      // Wrong answer should NOT end battle
      if (!accepted) {
        return;
      }

      if (winner === username) {
        setBattleResult("winner");
      } else {
        setBattleResult("loser");
      }
    };

    socket.on("battle-started", handleBattleStarted);
    socket.on("battle-result", handleBattleResult);

    return () => {
      socket.off("battle-started", handleBattleStarted);
      socket.off("battle-result", handleBattleResult);
    };
  }, [username]);

  // ============================================================
  // LOCAL STORAGE CODE
  // ============================================================

  useEffect(() => {
    if (!roomId) return;

    localStorage.setItem(`code-${roomId}`, code);
  }, [code, roomId]);

  // ============================================================
  // BATTLE TIMER
  // ============================================================

  useEffect(() => {
    if (!battleMode) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [battleMode]);

  // ============================================================
  // EDITOR
  // ============================================================

  const handleCodeChange = (value) => {
    const newCode = value || "";

    setCode(newCode);

    socket.emit("code-change", {
      roomId,
      code: newCode,
    });

    socket.emit("typing", {
      roomId,
      username,
    });
  };

  // ============================================================
  // LANGUAGE
  // ============================================================

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setInput("");

    socket.emit("language-change", {
      roomId,
      language: lang,
    });
  };

  // ============================================================
  // DOWNLOAD
  // ============================================================

  const handleDownload = () => {
    const extensionMap = {
      javascript: "js",
      python: "py",
      java: "java",
      cpp: "cpp",
      c: "c",
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

  // ============================================================
  // RUN CODE
  // ============================================================

  const handleRun = async () => {
    if (!code.trim()) {
      setOutput("Please write some code first.");
      return;
    }

    setRunning(true);
    setOutput("Running...");

    try {
      const response = await fetch(
        "https://real-time-collaborative-coding-platform-8rvo.onrender.com/api/code/run",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            language,
            code,
            input,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setOutput(
          typeof data.error === "string"
            ? data.error
            : data.error?.message ||
                JSON.stringify(data.error, null, 2)
        );

        return;
      }

      setOutput(data.output || "No Output");
    } catch (error) {
      console.error("Run Code Error:", error);

      setOutput(
        error.message || "Execution Failed"
      );
    } finally {
      setRunning(false);
    }
  };

  // ============================================================
  // CHAT
  // ============================================================

  const handleSendMessage = (text) => {
    if (!text?.trim()) return;

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

  // ============================================================
  // START BATTLE
  // ============================================================

  const handleStartBattle = () => {
    console.log("⚔️ Starting Battle");

    setBattleMode(true);
    setBattleResult(null);
    setTimeLeft(1800);
    setOutput("");

    socket.emit("start-battle", {
      roomId,
    });
  };

  // ============================================================
  // SUBMIT BATTLE
  // ============================================================

  const handleBattleSubmit = async () => {
    if (!battleMode) return;

    if (!code.trim()) {
      setOutput("Please write your solution first.");
      return;
    }

    if (timeLeft <= 0) {
      setOutput("⏰ Battle time is over.");
      return;
    }

    setRunning(true);
    setOutput("Checking solution...");

    try {
      const response = await fetch(
        "https://real-time-collaborative-coding-platform-8rvo.onrender.com/api/code/submit",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            language,
            code,
            roomId,
            username,
            problemIndex: currentProblem,

            input: "6\n2 1 5 1 3 2\n3",

            expectedOutput: "9",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setOutput(
          data.message || "Submission failed."
        );

        return;
      }

      setOutput(
        data.message || "Submission completed."
      );

      // =========================
      // ACCEPTED
      // =========================

      if (data.accepted) {
        // Winner gets popup immediately
        setBattleResult("winner");

        // Tell opponent
        socket.emit("battle-result", {
          roomId,
          username,
          accepted: true,
        });
      }

      // =========================
      // WRONG ANSWER
      // =========================

      else {
        setOutput(
          data.message || "Wrong Answer. Try again."
        );
      }
    } catch (error) {
      console.error(
        "Battle Submit Error:",
        error
      );

      setOutput(
        error.message || "Submission failed."
      );
    } finally {
      setRunning(false);
    }
  };

  // ============================================================
  // END BATTLE
  // ============================================================

  const handleEndBattle = () => {
    console.log("🛑 Battle Ended");

    setBattleMode(false);
    setBattleResult(null);
    setTimeLeft(1800);
    setOutput("");
  };

  // ============================================================
  // LEAVE ROOM
  // ============================================================

  const handleLeave = () => {
    socket.emit("leave-room", {
      roomId,
    });

    if (socket.connected) {
      socket.disconnect();
    }

    navigate("/");
  };

  // ============================================================
  // EXPORT
  // ============================================================

  return {
    roomId,
    username,

    // Editor
    code,
    input,
    setInput,
    language,
    theme,

    // Users / Chat
    users,
    messages,
    typingUser,
    chatBanner,
    unreadCount,
    isChatOpen,

    // Output
    output,
    running,

    // Battle
    battleMode,
    timeLeft,
    currentProblem,
    battleResult,

    // Setters
    setTheme,
    setIsChatOpen,
    setUnreadCount,

    // Editor handlers
    handleCodeChange,
    handleLanguageChange,
    handleDownload,
    handleRun,

    // Chat handlers
    handleSendMessage,
    clearOutput,

    // Battle handlers
    handleStartBattle,
    handleBattleSubmit,
    handleEndBattle,

    // Room
    handleLeave,
  };
}

export default EditorLogic;