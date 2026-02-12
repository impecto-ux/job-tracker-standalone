import React, { useState, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, UserPlus, X } from 'lucide-react';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

export const NotificationCenter = () => {
    const auth = useStore(state => state.auth);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [auth.user]);

    const fetchNotifications = async () => {
        if (!auth.user) return;
        try {
            const res = await api.get('/user-notifications');
            if (Array.isArray(res.data)) {
                setNotifications(res.data);
            } else {
                console.error("Invalid notifications data:", res.data);
                setNotifications([]);
            }

            const countRes = await api.get('/user-notifications/unread-count');
            setUnreadCount(countRes.data || 0);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await api.patch(`/user-notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.post(`/user-notifications/mark-all-read`);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('FAILED mark all read', err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} className="text-emerald-400" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-400" />;
            case 'assignment': return <UserPlus size={16} className="text-blue-400" />;
            case 'mention': return <div className="text-purple-400 font-bold">@</div>;
            default: return <Info size={16} className="text-zinc-400" />;
        }
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#09090b]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed top-16 right-4 left-4 w-auto sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-80 mt-2 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-zinc-600 text-sm">
                                    No notifications
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group ${!notification.read ? 'bg-white/2' : ''}`}
                                        onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 shrink-0">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-zinc-400'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-zinc-600 mt-2">
                                                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
