import { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

function ChatPanel({ messages = [], onSend, typingUser }) {
  const [message, setMessage] = useState("");

  const submit = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    onSend(message.trim());
    setMessage("");
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No messages yet
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className="bg-slate-800 rounded-xl p-3"
            >
              <p className="text-xs font-semibold text-blue-400 mb-1">
                {msg.username}
              </p>

              <p className="text-sm text-slate-200 break-words">
                {msg.text}
              </p>
            </div>
          ))
        )}

      </div>

      {/* Typing Indicator */}
      <div className="px-3 h-6 text-xs text-yellow-400">
        {typingUser ? `✍️ ${typingUser} is typing...` : ""}
      </div>

      {/* Input */}
      <form
        onSubmit={submit}
        className="border-t border-slate-700 p-3"
      >
        <div className="flex gap-2">

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg transition"
          >
            <FaPaperPlane />
          </button>

        </div>
      </form>

    </div>
  );
}

export default ChatPanel;