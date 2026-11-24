import { FaCircle } from "react-icons/fa";

function UsersPanel({ users = [] }) {
  return (
    <div className="h-full flex flex-col bg-slate-900">

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {users.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No users connected
          </div>
        ) : (
          users.map((user, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 rounded-xl px-3 py-2 transition"
            >

              {/* Avatar */}
<div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
  {user.username?.charAt(0).toUpperCase()}
</div>

              {/* User Info */}
              <div className="flex-1">

                <p className="font-medium text-white truncate">
                  {user.username}
                </p>

                <div className="flex items-center gap-2 text-xs text-green-400">
                  <FaCircle className="text-[7px]" />
                  Online
                </div>

              </div>

            </div>
          ))
        )}

      </div>

    </div>
  );
}

export default UsersPanel;