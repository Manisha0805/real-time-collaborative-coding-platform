import {
  FaTerminal,
  FaCopy,
  FaTrash,
  FaCheckCircle,
  FaSpinner,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { useState, useEffect } from "react";

function OutputPanel({
  output,
  running,
  clearOutput,
  input,
  setInput,
}) 
{
    const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Auto expand while running or when output arrives
  useEffect(() => {
    if (running || output) {
      setExpanded(true);
    }
  }, [running, output]);

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output || "");

    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="bg-slate-900 border-t border-slate-700">

      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="h-12 cursor-pointer flex items-center justify-between px-4 border-b border-slate-700 hover:bg-slate-800 transition"
      >
        <div className="flex items-center gap-3">

          {expanded ? (
            <FaChevronDown className="text-slate-400" />
          ) : (
            <FaChevronUp className="text-slate-400" />
          )}

          <FaTerminal className="text-green-400" />

          <span className="font-semibold">
            Console
          </span>

        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {running ? (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <FaSpinner className="animate-spin" />
              Running
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <FaCheckCircle />
              Ready
            </div>
          )}

          <button
            onClick={copyOutput}
            className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
          >
            <FaCopy />
          </button>

          <button
            onClick={clearOutput}
            className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      {/* Expandable Output */}
      {/* Expandable Output */}
{expanded && (
  <div className="bg-black overflow-auto">

    {/* Input Box */}
    <div className="border-b border-slate-700 p-3">
      <h3 className="text-sm text-slate-400 mb-2">
        Program Input
      </h3>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter input here..."
        className="w-full h-24 bg-slate-800 text-white rounded p-2 resize-none outline-none"
      />
      <div className="mt-2 flex justify-end">
  <button
    onClick={() => setInput("")}
    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
  >
    Clear Input
  </button>
</div>
    </div>

    {/* Output */}
    <div className="h-52 overflow-auto">
      {running ? (
        <div className="p-4 text-yellow-400 animate-pulse">
          Executing your program...
        </div>
      ) : output ? (
        <pre className="p-4 text-green-400 whitespace-pre-wrap break-words font-mono">
          {output}
        </pre>
      ) : (
        <div className="h-full flex items-center justify-center text-slate-500">
          Run your code to see the output.
        </div>
      )}
    </div>

  </div>
)}

    </section>
  );
}

export default OutputPanel;