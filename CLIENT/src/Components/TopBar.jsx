import {
  FaCopy,
  FaPlay,
  FaDownload,
  FaSignOutAlt,
  FaCode,
} from "react-icons/fa";
import { useState } from "react";

function TopBar({
  roomId,
  language,
  setLanguage,
  theme,
  setTheme,
  onRun,
  onDownload,
  onLeave,
  running,
  battleMode,
  onStartBattle,
  onEndBattle,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-700 px-5 flex items-center justify-between">

      {/* Left */}
      <div className="flex items-center gap-5">

        <div className="flex items-center gap-2">
          <FaCode className="text-blue-500 text-xl" />
          <h1 className="text-xl font-bold">
            CodeSync
          </h1>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg">

          <span className="text-slate-400 text-sm">
            Room
          </span>

          <span className="font-mono text-sm">
            {roomId}
          </span>

          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-white"
          >
            <FaCopy />
          </button>

          {copied && (
            <span className="text-xs text-green-400">
              Copied
            </span>
          )}

        </div>

      </div>

      {/* Right */}
      <div className="flex items-center gap-3">

        {/* Language */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="cpp">C++</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
        </select>

        {/* Theme */}
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="hidden lg:block bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="vs-dark">🌙</option>
          <option value="light">☀</option>
          <option value="hc-black">🖤</option>
        </select>

        {/* Run */}
        <button
          onClick={onRun}
          disabled={running}
          className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <FaPlay />
          {running ? "Running..." : "Run"}
        </button>

        {/* Battle */}
        {battleMode ? (
          <button
            onClick={onEndBattle}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg"
          >
            End Battle
          </button>
        ) : (
          <button
            onClick={onStartBattle}
            className="bg-orange-500 hover:bg-orange-400 px-4 py-2 rounded-lg"
          >
            Battle
          </button>
        )}

        {/* Download */}
        <button
          onClick={onDownload}
          className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg"
          title="Download"
        >
          <FaDownload />
        </button>

        {/* Leave */}
        <button
          onClick={onLeave}
          className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaSignOutAlt />
          Leave
        </button>

      </div>

    </header>
  );
}

export default TopBar;