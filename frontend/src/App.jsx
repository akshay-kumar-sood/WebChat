import { useEffect, useRef, useState } from 'react';
import { connectWS } from './ws';

// Custom SVG Logo Component
const Logo = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#075E54" />
        <path d="M28 12H12C10.8954 12 10 12.8954 10 14V26C10 27.1046 10.8954 28 12 28H18L23 33L23 28H28C29.1046 28 30 27.1046 30 26V14C30 12.8954 29.1046 12 28 12Z" fill="white" />
        <circle cx="16" cy="18" r="1.5" fill="#075E54" />
        <circle cx="20" cy="18" r="1.5" fill="#075E54" />
        <circle cx="24" cy="18" r="1.5" fill="#075E54" />
    </svg>
);

export default function App() {
    const timer = useRef(null);
    const socket = useRef(null);
    const [userName, setUserName] = useState('');
    const [showNamePopup, setShowNamePopup] = useState(true);
    const [inputName, setInputName] = useState('');
    const [typers, setTypers] = useState([]);

    // Initialize messages from localStorage
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('chat_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [text, setText] = useState('');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const fileInputRef = useRef(null);

    // Persist messages to localStorage
    useEffect(() => {
        localStorage.setItem('chat_history', JSON.stringify(messages));
    }, [messages]);

    // Apply theme
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        socket.current = connectWS();

        socket.current.on('connect', () => {
            socket.current.on('roomNotice', (userName) => {
                console.log(`${userName} joined to group!`);
            });

            socket.current.on('chatMessage', (msg) => {
                setMessages((prev) => [...prev, msg]);
            });

            socket.current.on('typing', (userName) => {
                setTypers((prev) => {
                    const isExist = prev.find((typer) => typer === userName);
                    if (!isExist) {
                        return [...prev, userName];
                    }
                    return prev;
                });
            });

            socket.current.on('stopTyping', (userName) => {
                setTypers((prev) => prev.filter((typer) => typer !== userName));
            });
        });

        return () => {
            socket.current.off('roomNotice');
            socket.current.off('chatMessage');
            socket.current.off('typing');
            socket.current.off('stopTyping');
        };
    }, []);

    useEffect(() => {
        if (text && socket.current) {
            socket.current.emit('typing', userName);
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => {
            if (socket.current) socket.current.emit('stopTyping', userName);
        }, 1000);

        return () => {
            clearTimeout(timer.current);
        };
    }, [text, userName]);

    function formatTime(ts) {
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    function handleNameSubmit(e) {
        e.preventDefault();
        const trimmed = inputName.trim();
        if (!trimmed) return;

        socket.current.emit('joinRoom', trimmed);
        setUserName(trimmed);
        setShowNamePopup(false);
    }

    function sendMessage(type = 'text', content = null) {
        const finalContent = content || text.trim();
        if (!finalContent && type === 'text') return;

        const msg = {
            id: Date.now(),
            sender: userName,
            type: type, // 'text', 'image', 'audio'
            text: type === 'text' ? finalContent : '',
            media: type !== 'text' ? finalContent : null,
            ts: Date.now(),
        };
        setMessages((m) => [...m, msg]);
        socket.current.emit('chatMessage', msg);
        if (type === 'text') setText('');
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : null;
            if (type) {
                sendMessage(type, event.target.result);
            } else {
                alert('Only images and audio are supported.');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    }

    function deleteChat() {
        if (window.confirm('Delete all messages?')) {
            setMessages([]);
            localStorage.removeItem('chat_history');
        }
    }

    function toggleTheme() {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4 font-inter transition-colors duration-300">
            {showNamePopup && (
                <div className="fixed inset-0 flex items-center justify-center z-40 bg-black/20 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-md p-6 border dark:border-zinc-800">
                        <h1 className="text-xl font-semibold text-black dark:text-white">Enter your name</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Enter your name to start chatting.
                        </p>
                        <form onSubmit={handleNameSubmit} className="mt-4">
                            <input
                                autoFocus
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                className="w-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md px-3 py-2 outline-green-500 placeholder-gray-400 dark:text-white"
                                placeholder="Your name (e.g. John Doe)"
                            />
                            <button
                                type="submit"
                                className="block ml-auto mt-3 px-4 py-1.5 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium cursor-pointer transition-colors">
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {!showNamePopup && (
                <div className="w-full max-w-2xl h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-md flex flex-col overflow-hidden border dark:border-zinc-800">
                    {/* CHAT HEADER */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <Logo />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-[#303030] dark:text-zinc-200">
                                Realtime group chat
                            </div>

                            {typers.length ? (
                                <div className="text-xs text-green-500">
                                    {typers.join(', ')} is typing...
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500">Online</div>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500 hidden sm:block">
                                Signed in as{' '}
                                <span className="font-medium text-[#303030] dark:text-zinc-200 capitalize">
                                    {userName}
                                </span>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 transition-colors"
                                title="Toggle Theme"
                            >
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>
                            <button
                                onClick={deleteChat}
                                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Delete All Chat"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>

                    {/* CHAT MESSAGE LIST */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-[#0b0b0b] flex flex-col">
                        {messages.map((m) => {
                            const mine = m.sender === userName;
                            return (
                                <div
                                    key={m.id}
                                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[78%] p-3 my-1 rounded-[18px] text-sm leading-5 shadow-sm ${mine
                                            ? 'bg-[#E7FFDB] dark:bg-[#056162] text-[#303030] dark:text-white rounded-tr-none'
                                            : 'bg-white dark:bg-[#262d31] text-[#303030] dark:text-zinc-200 rounded-tl-none'
                                            }`}>

                                        {m.type === 'text' && (
                                            <div className="break-words whitespace-pre-wrap">{m.text}</div>
                                        )}
                                        {m.type === 'image' && (
                                            <img src={m.media} alt="Shared" className="rounded-lg max-w-full h-auto cursor-pointer" onClick={() => window.open(m.media)} />
                                        )}
                                        {m.type === 'audio' && (
                                            <audio controls src={m.media} className="max-w-full" />
                                        )}

                                        <div className="flex justify-between items-center mt-1 gap-12">
                                            <div className="text-[10px] font-bold opacity-70">{m.sender}</div>
                                            <div className="text-[10px] opacity-50 text-right">
                                                {formatTime(m.ts)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* CHAT TEXTAREA */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <div className="flex items-center justify-between gap-4 border border-gray-200 dark:border-zinc-700 rounded-full px-2 bg-zinc-50 dark:bg-zinc-800">
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,audio/*"
                            />
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="p-2 text-gray-500 hover:text-green-500 transition-colors"
                                title="Attach Image or Audio"
                            >
                                📎
                            </button>
                            <textarea
                                rows={1}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                className="w-full resize-none px-2 py-3 text-sm outline-none bg-transparent dark:text-white"
                            />
                            <button
                                onClick={() => sendMessage()}
                                className="bg-green-500 hover:bg-green-600 text-white h-10 w-10 min-w-[40px] flex items-center justify-center rounded-full text-sm font-medium cursor-pointer transition-colors shadow-sm">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
