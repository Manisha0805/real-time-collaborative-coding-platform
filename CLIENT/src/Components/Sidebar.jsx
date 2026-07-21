import { useState } from "react";
import { FaUsers, FaComments } from "react-icons/fa";

import UsersPanel from "./UsersPanel";
import ChatPanel from "./ChatPanel";

function Sidebar({
  users,
  typingUser,
  messages,
  onSend,
}) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <aside className="h-full flex flex-col bg-slate-900 border-r border-slate-700">

      {/* Tabs */}
      <div className="flex border-b border-slate-700">

        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 transition ${
            activeTab === "users"
              ? "bg-slate-800 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <FaUsers />
          Users
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 transition ${
            activeTab === "chat"
              ? "bg-slate-800 text-emerald-400 border-b-2 border-emerald-500"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <FaComments />
          Chat
        </button>

      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {activeTab === "users" ? (
          <UsersPanel
            users={users}
            typingUser={typingUser}
          />
        ) : (
          <ChatPanel
  messages={messages}
  onSend={onSend}
  typingUser={typingUser}
/>
        )}

      </div>

    </aside>
  );
}

export default Sidebar;