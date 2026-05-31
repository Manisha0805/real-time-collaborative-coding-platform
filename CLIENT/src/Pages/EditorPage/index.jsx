import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { socket } from "./socket";
import TopBar from "../../Components/TopBar";
import UsersPanel from "../../Components/UsersPanel";
import CodeEditor from "../../Components/CodeEditor";
import OutputPanel from "../../Components/OutputPanel";
import ChatPanel from "../../Components/ChatPanel";

function EditorPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { username, language: initialLanguage } = location.state || {};
  const [typingUser, setTypingUser] = useState("");
  
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(initialLanguage || "C++");
  const [theme, setTheme] = useState("vs-dark");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);


  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }
    socket.connect();
    socket.emit("join-room", { roomId, username });

    socket.on("receive-code", (newCode) => {
  setCode(newCode);
});

socket.on("update-users", (users) => {
  setUsers(users);
});

socket.on("receive-message", (msg) => {
  setMessages((m) => [...m, msg]);
});
socket.on("typing", (user) => {
  setTypingUser(user);

  setTimeout(() => {
    setTypingUser("");
  }, 1500);
});
   

    return () => {
      socket.emit("leave-room", { roomId });
      socket.off();
      socket.disconnect();
    };
  }, [roomId, username, navigate]);

  const handleCodeChange = (val) => {
  setCode(val);

  socket.emit("code-change", {
    roomId,
    code: val,
  });

  socket.emit("typing", {
    roomId,
    username,
  });
};

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    socket.emit("language-change", { roomId, language: lang });
  };

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

    const data = await response.json();
    setOutput(data.output);
  } catch (error) {
    console.log(error);
    setOutput("Error running code");
  }

  setRunning(false);
};

 const handleSendMessage = (text) => {
  const msg = { username, text };

  socket.emit("send-message", {
    roomId,
    data: msg,
  });

  setMessages((m) => [...m, msg]);
};

  const handleLeave = () => navigate("/");
const clearOutput = () => {
  setOutput("");
};
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      <TopBar
  roomId={roomId}
  language={language}
  setLanguage={handleLanguageChange}
  theme={theme}
  setTheme={setTheme}
  onRun={handleRun}
  onLeave={handleLeave}
  running={running}
/>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] min-h-0">
<UsersPanel
  users={users}
  typingUser={typingUser}
/>
        <section className="flex flex-col min-h-0 order-1 lg:order-none">
          <CodeEditor code={code} language={language}   theme={theme} onChange={handleCodeChange} />
          <OutputPanel output={output} running={running}  clearOutput={clearOutput}/>
                  </section>

        <ChatPanel messages={messages} onSend={handleSendMessage} />
      </main>
    </div>
  );
}

export default EditorPage;
