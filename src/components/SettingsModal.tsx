import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Moon, Sun, User } from 'lucide-react';


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export default function SettingsModal({ isOpen, onClose, onLogout, theme, toggleTheme }: SettingsModalProps) {
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-lg">Settings</h2>
                            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Profile Section */}
                            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Telegram User</h3>
                                    <p className="text-xs text-muted-foreground">+1 234 *** **89</p>
                                </div>
                            </div>

                            <hr className="border-border" />

                            {/* Actions */}
                            <div className="space-y-2">
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        {theme === 'dark' ? (
                                            <Moon className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                                        ) : (
                                            <Sun className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                                        )}
                                        <span>Appearance</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground capitalize">{theme}</span>
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors text-left"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/30 text-center">
                            <p className="text-xs text-muted-foreground">Telegram Cloud Desktop v0.1.0</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
