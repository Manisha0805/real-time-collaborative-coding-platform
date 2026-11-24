import { Component } from "react";

// Prevents a render error (e.g. unexpected data) from blanking the whole app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("UI error:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0b1020] text-white p-6 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-slate-300">An unexpected error occurred. Reloading usually fixes it.</p>
        <button
          onClick={() => window.location.assign("/")}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500"
        >
          Back to home
        </button>
      </div>
    );
  }
}
