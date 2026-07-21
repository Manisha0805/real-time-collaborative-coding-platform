import Editor from "@monaco-editor/react";

export default function CodeEditor({
  code,
  language,
  theme,
  onChange,
}) {
  return (
    <div className="h-full flex flex-col bg-[#111827] rounded-b-xl overflow-hidden">

      {/* Editor */}
      <div className="flex-1">
        <Editor
          width="100%"
          height="100%"
          language={language}
          theme={theme}
          value={code}
          onChange={(value) => onChange(value || "")}
          options={{
            minimap: {
              enabled: false,
            },

            fontSize: 15,

            fontLigatures: true,

            automaticLayout: true,

            scrollBeyondLastLine: false,

            smoothScrolling: true,

            mouseWheelZoom: true,

            cursorBlinking: "smooth",

            cursorSmoothCaretAnimation: "on",

            roundedSelection: true,

            renderLineHighlight: "all",

            wordWrap: "on",

            bracketPairColorization: {
              enabled: true,
            },

            guides: {
              bracketPairs: true,
            },

            padding: {
              top: 18,
              bottom: 18,
            },
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="h-8 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-4 text-xs">

        <div className="flex items-center gap-4">

          <span className="text-green-400">
            ● Connected
          </span>

          <span className="uppercase text-slate-300">
            {language}
          </span>

        </div>

        <div className="text-slate-400">
          Monaco Editor
        </div>

      </div>

    </div>
  );
}