import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { ChevronDown, ArrowRight, Loader2 } from 'lucide-react';

interface AuthProps {
    onLogin: () => void;
}

const COUNTRIES = [
    { code: '+91', label: 'India', flag: '🇮🇳' },
    { code: '+1', label: 'USA', flag: '🇺🇸' },
    { code: '+44', label: 'UK', flag: '🇬🇧' },
    { code: '+86', label: 'China', flag: '🇨🇳' },
    { code: '+7', label: 'Russia', flag: '🇷🇺' },
    { code: '+81', label: 'Japan', flag: '🇯🇵' },
    { code: '+49', label: 'Germany', flag: '🇩🇪' },
    { code: '+33', label: 'France', flag: '🇫🇷' },
    { code: '+971', label: 'UAE', flag: '🇦🇪' },
];

export default function Auth({ onLogin }: AuthProps) {
    const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fullPhone = `${countryCode}${phone}`;
            await invoke('login_start', { phone: fullPhone });
            setStep('code');
        } catch (err: any) {
            setError(typeof err === 'string' ? err : "Failed to send code");
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
        } catch (err: any) {
            const msg = typeof err === 'string' ? err : "Login failed";
            if (msg.includes("PASSWORD_REQUIRED")) {
                setStep('password');
            } else {
                setError(msg);
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
        } catch (err: any) {
            setError(typeof err === 'string' ? err : "Password incorrect");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full bg-[#050505] text-white flex overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Left Panel - Form */}
            <div className="w-full md:w-[480px] flex flex-col justify-center px-12 z-20 relative bg-[#050505]/90 backdrop-blur-md border-r border-white/5 shadow-2xl">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="font-bold text-lg">P</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Paperfold</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-2 leading-tight">
                        Sign in to <br />
                        <span className="font-medium text-white">Paperfold</span>
                    </h1>
                    <p className="text-gray-500 text-lg">using Telegram</p>
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {step === 'phone' && (
                            <form onSubmit={handlePhoneSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider text-xs">Phone Number</label>
                                    <div className="flex gap-3">
                                        {/* Country Code Dropdown */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                className="h-14 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all min-w-[100px]"
                                            >
                                                <span className="text-lg font-mono">{countryCode}</span>
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            </button>

                                            {isDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 py-2">
                                                    {COUNTRIES.map((c) => (
                                                        <button
                                                            key={c.code}
                                                            type="button"
                                                            onClick={() => {
                                                                setCountryCode(c.code);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center justify-between group"
                                                        >
                                                            <span className="text-gray-300 group-hover:text-white transition-colors">{c.flag} {c.label}</span>
                                                            <span className="text-gray-500 font-mono text-sm">{c.code}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="98765 43210"
                                            className="flex-1 h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-lg focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600 font-medium tracking-wide"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !phone}
                                    className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                        <>
                                            Continue <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {step === 'code' && (
                            <form onSubmit={handleCodeSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wider text-xs">Enter Code</label>
                                        <button type="button" onClick={() => setStep('phone')} className="text-xs text-blue-400 hover:text-blue-300">Change Phone</button>
                                    </div>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="xxxxx"
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-lg text-center font-mono tracking-[0.5em] focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-700"
                                        autoFocus
                                        maxLength={5}
                                    />
                                    <p className="text-xs text-center text-gray-500">
                                        We've sent a code to your Telegram app.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || code.length < 5}
                                    className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Verify Code"}
                                </button>
                            </form>
                        )}

                        {step === 'password' && (
                            <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider text-xs">Two-Step Verification</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your cloud password"
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-lg focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Unlock"}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </AnimatePresence>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, marginTop: 0 }}
                        animate={{ opacity: 1, marginTop: 16 }}
                        className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-sm"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                    </motion.div>
                )}

                <div className="absolute bottom-8 left-12 right-12 text-xs text-gray-600 text-center">
                    By signing up, you agree to our Terms and Privacy Policy.
                </div>
            </div>

            {/* Right Panel - 3D Visual */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
                {/* Background Stars */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#050505] to-[#050505]" />
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }} />

                {/* 3D Wireframe Globe Simulation */}
                <div className="w-[600px] h-[600px] relative perspective-1000 opacity-80">
                    <Globe />
                </div>
            </div>
        </div>
    );
}

function Globe() {
    return (
        <div className="w-full h-full animate-[spin_60s_linear_infinite] relative preserve-3d">
            {/* Longitude Lines */}
            {[...Array(6)].map((_, i) => (
                <div
                    key={`long-${i}`}
                    className="absolute inset-0 border border-blue-500/20 rounded-full"
                    style={{
                        transform: `rotateY(${i * 30}deg)`
                    }}
                />
            ))}
            {/* Latitude Lines */}
            {[...Array(5)].map((_, i) => (
                <div
                    key={`lat-${i}`}
                    className="absolute border border-blue-500/20 rounded-full"
                    style={{
                        top: '50%',
                        left: '50%',
                        width: `${100 - i * 15}%`,
                        height: `${100 - i * 15}%`,
                        transform: `translate(-50%, -50%) rotateX(75deg)`
                    }}
                />
            ))}

            {/* Floating Particles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_20px_rgba(96,165,250,0.8)] animate-pulse" />
        </div>
    );
}
