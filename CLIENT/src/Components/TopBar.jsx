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
    <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">

      {/* Left */}
      <div className="flex items-center gap-4 min-w-0">

        <div className="flex items-center gap-2 shrink-0">
          <FaCode className="text-blue-500 text-xl" />
          <h1 className="text-xl font-bold text-white">
            CodeSync
          </h1>
        </div>

        {/* Room ID */}
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg min-w-0">

          <span className="text-slate-400 text-sm">
            Room
          </span>

          <span
            className="font-mono text-sm max-w-[120px] sm:max-w-[180px] truncate"
            title={roomId}
          >
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
      <div className="flex flex-wrap items-center justify-end gap-2">

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

        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="vs-dark">🌙</option>
          <option value="light">☀</option>
          <option value="hc-black">🖤</option>
        </select>

        <button
          onClick={onRun}
          disabled={running}
          className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlay />
          <span className="hidden sm:inline">
            {running ? "Running..." : "Run"}
          </span>
        </button>

        {battleMode ? (
          <button
            onClick={onEndBattle}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg"
          >
            End
          </button>
        ) : (
          <button
            onClick={onStartBattle}
            className="bg-orange-500 hover:bg-orange-400 px-4 py-2 rounded-lg"
          >
            Battle
          </button>
        )}

        <button
          onClick={onDownload}
          className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg"
        >
          <FaDownload />
        </button>

        <button
          onClick={onLeave}
          className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaSignOutAlt />
          <span className="hidden sm:inline">
            Leave
          </span>
        </button>

      </div>

    </header>
  );
}

export default TopBar;