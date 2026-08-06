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
  
   input,
  setInput,

  output,
  running,
  battleMode,
  timeLeft,

  chatBanner,
  unreadCount,
  setIsChatOpen,
  setUnreadCount,

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

      {/* ================= Notification ================= */}

      {chatBanner && (
        <div
          className="fixed top-5 right-5 z-50 w-80 rounded-xl border border-slate-700 bg-slate-800 shadow-2xl p-4 animate-bounce cursor-pointer"
          onClick={() => {
            setIsChatOpen(true);
            setUnreadCount(0);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">💬</div>

            <div className="flex-1">
              <h3 className="font-semibold text-white">
                New Message
              </h3>

              <p className="text-blue-400 text-sm">
                {chatBanner.username}
              </p>

              <p className="text-slate-300 text-sm truncate">
                {chatBanner.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= Top Bar ================= */}

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

      {/* ================= Main Layout ================= */}

      <main
        className={`flex-1 overflow-hidden ${
          battleMode
            ? "grid grid-cols-[240px_1fr_380px]"
            : "grid grid-cols-[240px_1fr]"
        }`}
      >
        {/* ================= Sidebar ================= */}

        <aside className="border-r border-slate-700 bg-slate-900 overflow-hidden">

          {/* Unread Badge */}

          {unreadCount > 0 && (
            <div className="bg-red-600 text-white text-xs text-center py-1 font-semibold">
              {unreadCount} New Message{unreadCount > 1 ? "s" : ""}
            </div>
          )}

          <Sidebar
            users={users}
            typingUser={typingUser}
            messages={messages}
            onSend={handleSendMessage}
          />
        </aside>

        {/* ================= Editor ================= */}

        <section className="flex flex-col bg-slate-950 overflow-hidden">

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

          <div className="flex-1 min-h-0">
            <CodeEditor
              code={code}
              language={language}
              theme={theme}
              onChange={handleCodeChange}
            />
          </div>

          <div className="border-t border-slate-700 bg-slate-900">
            <OutputPanel
  output={output}
  running={running}
  clearOutput={clearOutput}
  input={input}
  setInput={setInput}
/>
          </div>

        </section>

        {/* ================= Battle Panel ================= */}

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
                className="mt-8 rounded-xl bg-orange-500 px-6 py-3 font-semibold hover:bg-orange-600"
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