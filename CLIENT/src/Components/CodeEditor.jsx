import Editor from "@monaco-editor/react";

function CodeEditor({ code, language, theme,onChange }) {
  return (
    <div className="min-h-[280px] lg:min-h-0 flex-1">
      <Editor
        height="100%"
      theme={theme}
        language={language}
        value={code}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}

export default CodeEditor;
