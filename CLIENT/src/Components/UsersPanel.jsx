function UsersPanel({ users, typingUser }) {
  return (
    <aside className="bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-700 p-3 max-h-48 lg:max-h-none overflow-auto order-2 lg:order-none">
      <h2 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        Connected ({users.length})
      </h2>

      <ul className="space-y-1">
        {users.map((user, i) => (
          <li key={i}>👤 {user}</li>
        ))}
      </ul>

      {typingUser && (
        <p className="text-xs italic text-slate-400 mt-3">
          ✍️ {typingUser} is typing...
        </p>
      )}
    </aside>
  );
}

export default UsersPanel;
