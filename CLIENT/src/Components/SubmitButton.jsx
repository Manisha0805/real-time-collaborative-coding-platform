import {
  FaPaperPlane,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";

function SubmitButton({
  onSubmit,
  loading = false,
  disabled = false,
}) {
  return (
    <button
      onClick={onSubmit}
      disabled={loading || disabled}
      className={`
        relative overflow-hidden
        flex items-center justify-center gap-3
        w-full
        py-3 px-6
        rounded-xl
        font-semibold
        text-white
        transition-all duration-300
        ${
          disabled || loading
            ? "bg-slate-700 cursor-not-allowed opacity-70"
            : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/30"
        }
      `}
    >
      {loading ? (
        <>
          <FaSpinner className="animate-spin text-lg" />
          <span>Submitting...</span>
        </>
      ) : (
        <>
          <FaPaperPlane className="text-lg transition-transform group-hover:translate-x-1" />
          <span>Submit Solution</span>
        </>
      )}

      {!loading && !disabled && (
        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition duration-300" />
      )}
    </button>
  );
}

export default SubmitButton;