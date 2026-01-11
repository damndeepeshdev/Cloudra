import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Key, ShieldCheck, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface AuthProps {
    onLogin: () => void;
}

export default function Auth({ onLogin }: AuthProps) {
    const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Background animation variants
    const bgVariants = {
        animate: {
            backgroundPosition: ['0% 0%', '100% 100%'],
            transition: {
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse" as const,
                ease: "linear" as const
            }
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await invoke('login_start', { phone });
            setStep('code');
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await invoke('login_complete', { code, password: null });
            onLogin();
        } catch (err) {
            if (err === "PASSWORD_REQUIRED") {
                setStep('password');
            } else {
                setError(err as string);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await invoke('login_complete', { code, password });
            onLogin();
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans">
            {/* Animated Rich Gradient Background */}
            <motion.div
                className="absolute inset-0 bg-[size:400%_400%]"
                style={{
                    backgroundImage: 'linear-gradient(-45deg, #0f172a, #331052, #1e1b4b, #0f172a)'
                }}
                variants={bgVariants}
                animate="animate"
            />

            {/* Floating Orbs for depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
            </div>

            {/* Glass Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "circOut" as const }}
                className="w-full max-w-md p-8 m-4 relative z-10 backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]"
            >
                {/* Header */}
                <div className="text-center space-y-4 mb-8">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-20 h-20 mx-auto bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 transform rotate-3"
                    >
                        <Sparkles className="w-10 h-10 text-white" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200 tracking-tight">
                            Telegram Cloud
                        </h2>
                        <p className="text-blue-200/60 mt-2 text-sm">Secure. Unlimited. Private.</p>
                    </motion.div>
                </div>

                {/* Forms */}
                <AnimatePresence mode="wait">
                    {step === 'phone' && (
                        <motion.form
                            key="phone"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handlePhoneSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-blue-200/80 uppercase tracking-wider pl-1">Phone Number</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-3.5 h-5 w-5 text-blue-300/50 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="+1 234 567 8900"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-purple-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </motion.form>
                    )}

                    {step === 'code' && (
                        <motion.form
                            key="code"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleCodeSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-blue-200/80 uppercase tracking-wider pl-1">Verification Code</label>
                                <div className="relative group">
                                    <Key className="absolute left-4 top-3.5 h-5 w-5 text-blue-300/50 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="12345"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all tracking-widest text-lg"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-center text-white/40 mt-2">Check your Telegram app for the code.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-purple-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : 'Login'}
                            </button>
                        </motion.form>
                    )}

                    {step === 'password' && (
                        <motion.form
                            key="password"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handlePasswordSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-blue-200/80 uppercase tracking-wider pl-1">2FA Password</label>
                                <div className="relative group">
                                    <ShieldCheck className="absolute left-4 top-3.5 h-5 w-5 text-blue-300/50 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="Cloud Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-purple-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : 'Complete Login'}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-lg text-center backdrop-blur-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
