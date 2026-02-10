import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Clock, Play, MapPin } from 'lucide-react';
import VideoPlayer, { VideoPlayerRef } from '@/components/common/VideoPlayer';
import { useStore } from '@/lib/store'; // Assuming auth is here
import api from '@/lib/api';

interface Comment {
    id: number;
    content: string;
    timestamp?: number;
    context?: any;
    user: {
        id: number;
        username: string;
        fullName?: string;
        avatarUrl?: string;
    };
    createdAt: string;
}

interface VideoReviewPanelProps {
    task: any; // Using any for flexibility now, but ideally Task interface
    videoUrl: string;
    onClose: () => void;
    onCommentAdded?: (comment: Comment) => void;
}

const formatTime = (seconds: number) => {
    const mm = Math.floor(seconds / 60);
    const ss = Math.floor(seconds % 60);
    // const ms = Math.floor((seconds % 1) * 100);
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

export const VideoReviewPanel = ({ task, videoUrl, onClose, onCommentAdded }: VideoReviewPanelProps) => {
    const playerRef = useRef<VideoPlayerRef>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Local state for comments, initialized from task but updated locally
    const [comments, setComments] = useState<Comment[]>(task.comments || []);
    const auth = useStore(state => state.auth);

    // Filter only comments with timestamps for the timeline (or show all?)
    // Let's show all but highlight timestamped ones
    const timestampedComments = comments.filter(c => c.timestamp !== undefined && c.timestamp !== null).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const handleTimeUpdate = (time: number) => {
        setCurrentTime(time);
    };

    const handleSeekToComment = (timestamp: number) => {
        playerRef.current?.seekTo(timestamp);
        playerRef.current?.play(); // Auto play? or just seek?
    };

    const handleSubmitComment = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!commentText.trim()) return;

        setIsSubmitting(true);
        try {
            // Include current timestamp
            const timestamp = currentTime;

            const res = await api.post(`/tasks/${task.id}/comments`, {
                content: commentText,
                timestamp: timestamp,
                context: { type: 'video_review', videoUrl } // Optional context
            });

            // Optimistic update or use response
            // The response should be the created comment
            const newComment = res.data;

            // If response doesn't include user relations fully, patch it
            if (!newComment.user && auth.user) {
                newComment.user = auth.user;
            }

            setComments(prev => [...prev, newComment]);
            setCommentText('');
            if (onCommentAdded) onCommentAdded(newComment);

        } catch (error) {
            console.error("Failed to add comment:", error);
            alert("Failed to post comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden relative">
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-500/20 rounded border border-indigo-500/30 text-indigo-400">
                        <Play size={16} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">Video Review</h3>
                        <p className="text-[10px] text-zinc-500 font-mono">{task.title}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content: Player */}
                <div className="flex-1 bg-black/50 flex flex-col items-center justify-center p-4 relative group/player">
                    <div className="w-full max-w-4xl aspect-video bg-black rounded-lg shadow-2xl overflow-hidden border border-white/10 relative">
                        <VideoPlayer
                            ref={playerRef}
                            src={videoUrl}
                            className="w-full h-full"
                            onTimeUpdate={handleTimeUpdate}
                            onDurationChange={setDuration}
                        />
                    </div>

                    {/* Visual Timeline Marker for comments */}
                    {/* This could be integrated into the player later, or shown below */}
                </div>

                {/* Sidebar: Comments */}
                <div className="w-80 border-l border-white/10 bg-zinc-950 flex flex-col shrink-0 z-10">
                    <div className="p-3 border-b border-white/5 bg-zinc-900/50 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Comments ({comments.length})</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {comments.length === 0 ? (
                            <div className="text-center py-10 text-zinc-600 text-sm">
                                No comments yet.<br />Be the first to leave feedback!
                            </div>
                        ) : (
                            comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((comment) => (
                                <div key={comment.id} className="group relative pl-4 border-l-2 border-white/5 hover:border-indigo-500 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-zinc-300">{comment.user?.fullName || comment.user?.username || 'Unknown'}</span>
                                        <span className="text-[10px] text-zinc-600">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {comment.timestamp !== undefined && comment.timestamp !== null && (
                                        <button
                                            onClick={() => handleSeekToComment(comment.timestamp!)}
                                            className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-900 border border-indigo-500/50 flex items-center justify-center text-[8px] font-bold text-indigo-400 hover:scale-110 transition-transform cursor-pointer shadow-lg shadow-indigo-900/20"
                                            title={`Jump to ${formatTime(comment.timestamp!)}`}
                                        >
                                            <Clock size={8} />
                                        </button>
                                    )}

                                    <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{comment.content}</div>

                                    {comment.timestamp !== undefined && comment.timestamp !== null && (
                                        <div
                                            className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-mono text-indigo-400 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                                            onClick={() => handleSeekToComment(comment.timestamp!)}
                                        >
                                            <Play size={8} fill="currentColor" /> {formatTime(comment.timestamp)}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-white/10 bg-zinc-900">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1">
                                <Clock size={10} />
                                At {formatTime(currentTime)}
                            </span>
                            <span className="text-[10px] text-zinc-500">Leaving a comment at this frame</span>
                        </div>
                        <form onSubmit={handleSubmitComment} className="relative">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Type your feedback..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 pr-10 text-sm text-zinc-200 focus:border-indigo-500/50 outline-none resize-none h-20"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmitComment();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => handleSubmitComment()}
                                disabled={!commentText.trim() || isSubmitting}
                                className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
