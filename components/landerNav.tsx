export default function LanderNav() {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-lg rounded-full bg-white/70 backdrop-blur-lg shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-gray-200 flex items-center justify-center px-6 py-2 ring-1 ring-white/30 transition-all duration-200 hover:scale-105 hover:opacity-95">
      {/* Left links */}
      <div className="flex items-center gap-4 absolute left-8 top-1/2 -translate-y-1/2">
        <a href="/#how-it-works" className="text-gray-700 hover:text-blue-600 font-medium">How it Works</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Pricing</a>
      </div>
      {/* Center logo */}
      <div className="flex-1 flex justify-center">
        <a href="/" className="font-extrabold text-xl md:text-2xl tracking-tight text-blue-600">LearnPeers</a>
      </div>
      {/* Right links */}
      <div className="flex items-center gap-4 absolute right-8 top-1/2 -translate-y-1/2">
        <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">About</a>
        <a href="/auth/login" className="ml-2 py-1.5 px-3 bg-gradient-to-r from-[#1089d3] to-[#12B1D1] text-white rounded-full font-semibold hover:bg-blue-700 transition">Log In</a>
      </div>
    </nav>
  );
}
