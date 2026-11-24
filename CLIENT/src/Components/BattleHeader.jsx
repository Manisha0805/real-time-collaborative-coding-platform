import {
  FaFire,
  FaUsers,
  FaClock,
  FaTrophy,
} from "react-icons/fa";

function BattleHeader({
  battleMode,
  roomId,
  participants,
  timeLeft,
}) {
  if (!battleMode) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isDanger = timeLeft <= 60;
  const isWarning = timeLeft <= 300 && timeLeft > 60;

  return (
    <div className="h-14 bg-gradient-to-r from-orange-600 to-red-600 border-b border-orange-700">

      <div className="h-full px-6 flex items-center justify-between">

        {/* Left */}
        <div className="flex items-center gap-3">

          <FaFire
            className={`text-xl ${
              isDanger ? "animate-pulse text-yellow-300" : "text-yellow-200"
            }`}
          />

          <span className="font-semibold text-white">
            Battle Mode
          </span>

        </div>

        {/* Center */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white">

          <div className="flex items-center gap-2">
            <FaUsers />
            {participants}
          </div>

          <div>
            Room :
            <span className="ml-1 font-semibold">
              {roomId}
            </span>
          </div>

        </div>

        {/* Right */}
        <div className="flex items-center gap-4">

          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg font-semibold
              ${
                isDanger
                  ? "bg-red-700"
                  : isWarning
                  ? "bg-yellow-500 text-black"
                  : "bg-emerald-600"
              }`}
          >
            <FaClock />

            {minutes.toString().padStart(2, "0")}:
            {seconds.toString().padStart(2, "0")}
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 rounded-lg font-semibold">
            <FaTrophy />
            Winner Takes All
          </div>

        </div>

      </div>
    </div>
  );
}

export default BattleHeader;