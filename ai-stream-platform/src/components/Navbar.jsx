import React, { useEffect, useState } from 'react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const auth = useAuth();
    const { currentUser, signInWithGoogle, logOut } = auth || {};
    const [error, setError] = useState("");

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogin = async () => {
        setError("");
        try {
            await signInWithGoogle();
        } catch (err) {
            setError("Login Error (See Console)");
            console.error(err);
        }
    };

    return (
        <nav className={`fixed top-0 w-full z-50 h-[68px] transition-all duration-300 px-4 sm:px-12 flex items-center justify-between
            ${isScrolled ? 'bg-zinc-900/95 backdrop-blur-md shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>

            <div className="flex items-center gap-12">
                <img src={logo} alt="AIFLIX Logo" className="h-8 cursor-pointer hover:opacity-80 transition" />

                <ul className="hidden md:flex gap-6 text-sm font-medium text-gray-300">
                    <li><a href="#" className="hover:text-white transition font-bold text-white">Home</a></li>
                    <li><a href="#" className="hover:text-white transition">Series</a></li>
                    <li><a href="#" className="hover:text-white transition">Films</a></li>
                    <li><a href="#" className="hover:text-white transition">New & Popular</a></li>
                </ul>
            </div>

            <div className="flex items-center gap-6 text-white">
                {error && <span className="text-red-500 text-xs">{error}</span>}
                <i className="fas fa-search text-xl cursor-pointer hover:scale-110 transition opacity-90 hover:opacity-100"></i>
                <i className="fas fa-bell text-xl cursor-pointer hover:scale-110 transition opacity-90 hover:opacity-100"></i>

                {currentUser ? (
                    <div className="cursor-pointer hover:ring-2 ring-white rounded" onClick={() => logOut && logOut()} title="Logout">
                        <img
                            src={currentUser.photoURL || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"}
                            alt="User"
                            className="w-8 h-8 rounded"
                        />
                    </div>
                ) : (
                    <button
                        onClick={handleLogin}
                        className="bg-netflix-red text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
