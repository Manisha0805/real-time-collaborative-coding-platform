import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { socket } from "../../Services/socket";
import api, { apiErrorMessage, getUser, clearSession } from "../../API/client";

const DEFAULT_BATTLE_SECONDS = 1800;
const TYPING_EMIT_INTERVAL_MS = 700;

function EditorLogic() {
  const typingTimeout = useRef(null);
  const bannerTimeout = useRef(null);
  const lastTypingEmit = useRef(0);
  const isChatOpenRef = useRef(false);
  const codeRef = useRef("");
  const hasSyncedRef = useRef(false);

  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Identity comes from the router state (set by Home) and falls back to the stored session,
  // so opening /editor/ROOMID directly in a logged-in browser also works.
  const session = getUser();
  const routeState = location.state || {};
  const username = routeState.username || session?.name;
  const userId = routeState.userId ?? session?.id;
  const initialLanguage = routeState.language;

  const [code, setCode] = useState(() => {
    return localStorage.getItem(`code-${roomId}`) || "";
  });

  const [language, setLanguage] = useState(
    initialLanguage?.toLowerCase() || "cpp",
  );

  const [theme, setTheme] = useState("vs-dark");

  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  const [chatBanner, setChatBanner] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpenState] = useState(false);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const [battleMode, setBattleMode] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [battleResult, setBattleResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_BATTLE_SECONDS);

  // The socket handlers below are registered once; they read the latest values through refs
  const setIsChatOpen = (value) => {
    const next = typeof value === "function" ? value(isChatOpenRef.current) : value;
    isChatOpenRef.current = next;
    setIsChatOpenState(next);
  };

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // ============================================================
  // SOCKET CONNECTION + ROOM
  // ============================================================

  useEffect(() => {
    if (!username || !userId) {
      navigate("/");
      return;
    }

    // Runs on the first connect AND on every automatic reconnect. The server forgets a socket's
    // room membership when it drops, so the room has to be joined again each time.
    const joinRoom = () => {
      hasSyncedRef.current = false;
      socket.emit("join-room", { roomId, username });
    };

    const handleConnect = () => {
      setConnected(true);
      joinRoom();
    };

    const handleDisconnect = () => setConnected(false);

    const handleConnectError = (error) => {
      if (error?.message === "AUTH_INVALID" || error?.message === "AUTH_REQUIRED") {
        clearSession();
        navigate("/login");
      }
    };

    const handleJoinError = ({ message }) => {
      alert(message || "Could not join the room.");
      navigate("/");
    };

    const handleReceiveCode = (newCode) => {
      // First sync after joining: if the server has nothing yet but we have a local copy
      // (e.g. page refresh), keep ours and seed the server instead of wiping it.
      if (!hasSyncedRef.current) {
        hasSyncedRef.current = true;
        if (newCode === "" && codeRef.current) {
          socket.emit("code-change", { roomId, code: codeRef.current });
          return;
        }
      }
      setCode(newCode);
    };

    const handleUsersUpdate = (updatedUsers) => {
      setUsers(updatedUsers);
    };

    const handleReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);

      if (!isChatOpenRef.current) {
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

    const handleTyping = (user) => {
      setTypingUser(user);

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        setTypingUser("");
      }, 1500);
    };

    const handleLanguage = (lang) => {
      setLanguage(lang);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("join-error", handleJoinError);
    socket.on("receive-code", handleReceiveCode);
    socket.on("users-update", handleUsersUpdate);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("receive-language", handleLanguage);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      if (socket.connected) {
        socket.emit("leave-room", { roomId });
      }

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("join-error", handleJoinError);
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

      socket.disconnect();
    };
  }, [roomId, username, userId, navigate]);

  // ============================================================
  // BATTLE SOCKET LISTENERS
  // The server decides when a battle starts/ends and who wins.
  // ============================================================

  useEffect(() => {
    if (!username || !userId) return;

    const applyBattleState = ({ problemIndex, timeLeft: remaining } = {}) => {
      setBattleMode(true);
      setBattleResult(null);
      setCurrentProblem(Number.isInteger(problemIndex) ? problemIndex : 0);
      setTimeLeft(Number.isFinite(remaining) ? remaining : DEFAULT_BATTLE_SECONDS);
    };

    const handleBattleStarted = (state) => {
      applyBattleState(state);
      setOutput("");
    };

    const handleBattleState = (state) => {
      if (state?.active) applyBattleState(state);
    };

    const handleBattleProblem = ({ problemIndex }) => {
      if (Number.isInteger(problemIndex)) setCurrentProblem(problemIndex);
    };

    const handleBattleResult = ({ userId: winnerId, accepted }) => {
      if (!accepted) return;
      setBattleResult(Number(winnerId) === Number(userId) ? "winner" : "loser");
    };

    const handleBattleEnded = ({ reason } = {}) => {
      setBattleMode(false);
      setBattleResult(null);
      setTimeLeft(DEFAULT_BATTLE_SECONDS);
      setOutput(reason === "timeout" ? "⏰ Battle time is over." : "");
    };

    socket.on("battle-started", handleBattleStarted);
    socket.on("battle-state", handleBattleState);
    socket.on("battle-problem", handleBattleProblem);
    socket.on("battle-result", handleBattleResult);
    socket.on("battle-ended", handleBattleEnded);

    return () => {
      socket.off("battle-started", handleBattleStarted);
      socket.off("battle-state", handleBattleState);
      socket.off("battle-problem", handleBattleProblem);
      socket.off("battle-result", handleBattleResult);
      socket.off("battle-ended", handleBattleEnded);
    };
  }, [username, userId]);

  // ============================================================
  // LOCAL STORAGE CODE
  // ============================================================

  useEffect(() => {
    if (!roomId) return;

    localStorage.setItem(`code-${roomId}`, code);
  }, [code, roomId]);

  // ============================================================
  // BATTLE TIMER (display only - the server enforces the deadline)
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

    // The "typing..." indicator only needs an occasional ping, not one per keystroke
    const now = Date.now();
    if (now - lastTypingEmit.current > TYPING_EMIT_INTERVAL_MS) {
      lastTypingEmit.current = now;
      socket.emit("typing", { roomId });
    }
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
      const { data } = await api.post("/code/run", { language, code, input });

      setOutput(data.output || "No Output");
    } catch (error) {
      console.error("Run Code Error:", error);

      setOutput(apiErrorMessage(error, "Execution Failed"));
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
  // START BATTLE (state is applied when the server confirms it)
  // ============================================================

  const handleStartBattle = () => {
    socket.emit("start-battle", {
      roomId,
    });
  };

  // ============================================================
  // PROBLEM NAVIGATION (shared by everyone in the battle)
  // ============================================================

  const handleProblemChange = (index) => {
    setCurrentProblem(index);

    if (battleMode) {
      socket.emit("battle-problem-change", {
        roomId,
        problemIndex: index,
      });
    }
  };

  // ============================================================
  // SUBMIT BATTLE
  // Only the code is sent. The server knows the test cases, identifies
  // the player from the login token and decides the winner.
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
      const { data } = await api.post("/code/submit", {
        language,
        code,
        roomId,
        problemIndex: currentProblem,
      });

      setOutput(data.message || "Submission completed.");

      if (data.accepted && data.won) {
        setBattleResult("winner");
      }
    } catch (error) {
      console.error("Battle Submit Error:", error);

      setOutput(apiErrorMessage(error, "Submission failed."));
    } finally {
      setRunning(false);
    }
  };

  // ============================================================
  // END BATTLE
  // ============================================================

  const handleEndBattle = () => {
    // While a battle is still undecided, ending it ends it for everyone.
    // After a result is shown, this only dismisses the overlay locally.
    if (battleMode && !battleResult) {
      socket.emit("end-battle", { roomId });
    }

    setBattleMode(false);
    setBattleResult(null);
    setTimeLeft(DEFAULT_BATTLE_SECONDS);
    setOutput("");
  };

  // ============================================================
  // LEAVE ROOM
  // ============================================================

  const handleLeave = () => {
    if (socket.connected) {
      socket.emit("leave-room", {
        roomId,
      });
    }

    socket.disconnect();

    navigate("/");
  };

  // ============================================================
  // EXPORT
  // ============================================================

  return {
    roomId,
    username,
    userId,

    code,
    input,
    setInput,
    language,
    theme,

    connected,
    users,
    messages,
    typingUser,
    chatBanner,
    unreadCount,
    isChatOpen,

    output,
    running,

    battleMode,
    timeLeft,
    currentProblem,
    battleResult,

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
    handleBattleSubmit,
    handleEndBattle,
    handleProblemChange,

    handleLeave,
  };
}

export default EditorLogic;
