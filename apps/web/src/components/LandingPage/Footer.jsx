export function Footer() {
  return (
    <footer className="py-12 px-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-t border-blue-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="https://ucarecdn.com/da3f3549-c70d-42b7-b757-fe06ec027b6a/-/format/auto/"
              alt="Water AI Logo"
              className="w-9 h-9 object-contain"
            />
            <span className="text-lg font-semibold text-gray-900">
              Water AI
            </span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-600">
              &copy; 2025 Water AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
