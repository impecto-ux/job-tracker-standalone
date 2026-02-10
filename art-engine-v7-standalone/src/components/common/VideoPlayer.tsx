import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists, based on package.json clsx/tailwind-merge. If not I'll remove it.

interface VideoPlayerProps {
    src: string;
    onTimeUpdate?: (currentTime: number) => void;
    onDurationChange?: (duration: number) => void;
    className?: string;
    poster?: string;
}

export interface VideoPlayerRef {
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
}

const formatTime = (seconds: number) => {
    const mm = Math.floor(seconds / 60);
    const ss = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
};

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ src, onTimeUpdate, onDurationChange, className, poster }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);
    let controlsTimeout: NodeJS.Timeout;

    useImperativeHandle(ref, () => ({
        play: () => videoRef.current?.play(),
        pause: () => videoRef.current?.pause(),
        seekTo: (time: number) => {
            if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, Math.min(time, videoRef.current.duration));
            }
        },
        getCurrentTime: () => videoRef.current?.currentTime || 0,
        getDuration: () => videoRef.current?.duration || 0,
    }));

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (onTimeUpdate) onTimeUpdate(video.currentTime);
        };

        const handleDurationChange = () => {
            setDuration(video.duration);
            if (onDurationChange) onDurationChange(video.duration);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [onTimeUpdate, onDurationChange]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const stepFrame = (frames: number) => {
        if (videoRef.current) {
            // Assume 30fps for now, or 24? 
            // Frame stepping is approximate without exact FPS metadata.
            // Using 0.0416 (1/24) or 0.033 (1/30). Let's use 0.04 (25fps) as safe middle ground.
            videoRef.current.currentTime += frames * 0.04;
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const changeSpeed = () => {
        const rates = [0.5, 1, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (videoRef.current) videoRef.current.playbackRate = nextRate;
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (document.fullscreenElement) document.exitFullscreen();
            else videoRef.current.requestFullscreen();
        }
    };

    return (
        <div
            className={`relative group bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
                poster={poster}
            />

            {/* Controls Overlay */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-2 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Progress Bar */}
                <div className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/progress hover:h-2 transition-all">
                    <div
                        className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        step={0.01}
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                </div>

                <div className="flex items-center justify-between text-white/90">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="hover:text-emerald-400 transition-colors">
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>

                        <div className="flex items-center gap-1 text-xs font-mono tracking-wider select-none">
                            <span>{formatTime(currentTime)}</span>
                            <span className="text-white/40">/</span>
                            <span>{formatTime(duration)}</span>
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-2 group/vol relative">
                            <button onClick={toggleMute} className="hover:text-white transition-colors">
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                            {/* Volume Slider visible on hover */}
                            <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setVolume(v);
                                        if (videoRef.current) videoRef.current.volume = v;
                                        setIsMuted(v === 0);
                                    }}
                                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Frame Stepping */}
                        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                            <button onClick={() => stepFrame(-1)} className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"><ChevronLeft size={16} /></button>
                            <button onClick={() => stepFrame(1)} className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"><ChevronRight size={16} /></button>
                        </div>

                        {/* Speed */}
                        <button onClick={changeSpeed} className="text-xs font-bold hover:text-white w-8 text-center select-none">
                            {playbackRate}x
                        </button>

                        <button onClick={toggleFullscreen} className="hover:text-white">
                            <Maximize size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
