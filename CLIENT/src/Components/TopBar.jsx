function TopBar({ roomId, language, setLanguage,theme,setTheme, onRun, onLeave, running }) {
  return (
    <header className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs sm:text-sm text-slate-400 shrink-0">Room:</span>
        <span className="text-xs sm:text-sm font-mono truncate max-w-[140px] sm:max-w-xs">
          {roomId}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(roomId)}
          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
        >
          Copy
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto flex-wrap">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs sm:text-sm bg-slate-700 px-2 py-1 rounded outline-none"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
        </select>
<select
  value={theme}
  onChange={(e) => setTheme(e.target.value)}
  className="text-xs sm:text-sm bg-slate-700 px-2 py-1 rounded outline-none"
>
  <option value="vs-dark">Dark</option>
  <option value="light">Light</option>
  <option value="hc-black">High Contrast</option>
</select>
        <button
          onClick={onRun}
          disabled={running}
          className="text-xs sm:text-sm px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          {running ? "Running…" : "Run"}
        </button>

        <button
          onClick={onLeave}
          className="text-xs sm:text-sm px-3 py-1 rounded bg-rose-600 hover:bg-rose-500"
        >
          Leave
        </button>
      </div>
    </header>
  );
}

export default TopBar;
