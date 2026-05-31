import { useState } from "react";

function ChatPanel({ messages, onSend }) {
  const [message, setMessage] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage("");
  };

  return (
    <aside className="flex flex-col bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 max-h-72 lg:max-h-none order-3 lg:order-none">
      <h2 className="text-xs uppercase tracking-wide text-slate-400 px-3 py-2 border-b border-slate-700">
        Chat
      </h2>

      <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold text-emerald-400">{msg.username}: </span>
            <span className="break-words">{msg.text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 p-2 border-t border-slate-700">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
          className="flex-1 min-w-0 px-3 py-2 rounded bg-slate-700 outline-none text-sm"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm"
        >
          Send
        </button>
      </form>
    </aside>
  );
}

export default ChatPanel;
