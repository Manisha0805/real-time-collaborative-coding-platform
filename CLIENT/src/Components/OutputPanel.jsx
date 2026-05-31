function OutputPanel({ output, running, clearOutput }) {
  const copyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  return (
    <section className="bg-slate-950 border-t border-slate-700 p-3 max-h-56 overflow-auto">

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300">
          Console Output
        </h2>

        <div className="flex items-center gap-2">
          {running && (
            <span className="text-xs text-yellow-400 animate-pulse">
              Running...
            </span>
          )}

          <button
            onClick={copyOutput}
            className="px-2 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500"
          >
            Copy
          </button>

          <button
            onClick={clearOutput}
            className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-black rounded-lg p-3 border border-slate-800 min-h-[120px]">
        <pre className="text-sm text-green-400 whitespace-pre-wrap break-words">
          {output || "Run your code to see output"}
        </pre>
      </div>

    </section>
  );
}

export default OutputPanel;