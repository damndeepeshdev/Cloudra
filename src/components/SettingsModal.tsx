import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Moon, Sun, User, Settings, Cloud } from 'lucide-react';


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    onDownloadAll: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export default function SettingsModal({ isOpen, onClose, onLogout, onDownloadAll, theme, toggleTheme }: SettingsModalProps) {
    const handleLogout = async () => {
        // In future: call backend to clear session file
        // For now, just clear frontend state
        onLogout();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <h2 className="font-bold text-lg text-white">Settings</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Profile Section */}
                            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">Telegram User</h3>
                                    <p className="text-xs text-cyan-400">+1 234 *** **89</p>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            {/* Actions */}
                            <div className="space-y-2">
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                            {theme === 'dark' ? (
                                                <Moon className="w-4 h-4" />
                                            ) : (
                                                <Sun className="w-4 h-4" />
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-200 group-hover:text-white">Appearance</span>
                                    </div>
                                    <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-gray-400 capitalize border border-white/5">
                                        {theme}
                                    </span>
                                </button>

                                <button
                                    onClick={onDownloadAll}
                                    className="w-full flex items-center gap-3 p-3.5 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group"
                                >
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                                        <Cloud className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-200 group-hover:text-white">Download Backup</span>
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 p-3.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl transition-colors border border-transparent hover:border-red-500/20 group"
                                >
                                    <div className="p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors">
                                        <LogOut className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium">Log Out</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
                            <p className="text-[10px] text-gray-600 font-mono tracking-wider">TELEGRAM CLOUD DESKTOP v0.1.0</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
