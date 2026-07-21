import TopBar from "../../Components/TopBar";
import CodeEditor from "../../Components/CodeEditor";
import Sidebar from "../../Components/Sidebar";
import OutputPanel from "../../Components/OutputPanel";
import BattleHeader from "../../Components/BattleHeader";
import ProblemPanel from "../../Components/ProblemPanel";

function EditorLayout({
  roomId,
  language,
  theme,
  users,
  messages,
  typingUser,
  code,
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
}) {
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">

      <TopBar
        roomId={roomId}
        language={language}
        setLanguage={handleLanguageChange}
        theme={theme}
        setTheme={setTheme}
        onRun={handleRun}
        onDownload={handleDownload}
        onLeave={handleLeave}
        running={running}
        battleMode={battleMode}
        onStartBattle={handleStartBattle}
        onEndBattle={handleEndBattle}
      />
<BattleHeader
    battleMode={battleMode}
    roomId={roomId}
    participants={users.length}
    timeLeft={timeLeft}
/>
    <main
  className={`flex-1 overflow-hidden ${
    battleMode ? "grid grid-cols-[240px_1fr_380px]" : "grid grid-cols-[240px_1fr]"
  }`}
>
  {/* LEFT SIDEBAR */}
  <aside className="border-r border-slate-700 bg-slate-900 overflow-hidden">
    <Sidebar
      users={users}
      typingUser={typingUser}
      messages={messages}
      onSend={handleSendMessage}
    />
  </aside>

  {/* CENTER */}
  <section className="flex flex-col bg-slate-950 overflow-hidden">

    {/* Editor Header */}
    <div className="h-11 border-b border-slate-700 bg-slate-900 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="text-green-400">●</span>
        <span className="text-sm text-slate-300">
          main.{language === "cpp" ? "cpp" : language}
        </span>
      </div>

      <span className="text-xs text-emerald-400">
        Synced
      </span>
    </div>

    {/* Monaco */}
    <div className="flex-1 min-h-0">
      <CodeEditor
        code={code}
        language={language}
        theme={theme}
        onChange={handleCodeChange}
      />
    </div>

    {/* Console */}
    <div className="border-t border-slate-700 bg-slate-900">
      <OutputPanel
        output={output}
        running={running}
        clearOutput={clearOutput}
      />
    </div>

  </section>

  {/* RIGHT */}
  {battleMode ? (
    <aside className="border-l border-slate-700 bg-slate-900 overflow-hidden">
      <ProblemPanel />
    </aside>
  ) : (
    <aside className="hidden xl:flex items-center justify-center border-l border-slate-700 bg-slate-900">
      <div className="text-center">

        <h2 className="text-3xl font-bold text-orange-500">
          ⚔ Battle Arena
        </h2>

        <p className="text-slate-400 mt-4">
          Challenge your friends in real-time coding battles.
        </p>

        <button
          onClick={handleStartBattle}
          className="mt-8 bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-xl font-semibold"
        >
          Start Battle
        </button>

      </div>
    </aside>
  )}
</main> 

    </div>
  );
}

export default EditorLayout;