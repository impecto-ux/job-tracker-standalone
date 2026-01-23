import React from 'react';

const ContentCard = ({ item }) => {
    return (
        <div className="relative flex-none w-[200px] sm:w-[240px] aspect-video bg-zinc-800 rounded-md cursor-pointer transition-all duration-300 hover:scale-105 hover:z-50 hover:shadow-2xl group">
            <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover rounded-md group-hover:rounded-t-md group-hover:rounded-b-none"
            />

            {/* Hover Info Card */}
            <div className="absolute top-full left-0 w-full bg-zinc-800 p-4 rounded-b-md shadow-xl opacity-0 translate-y-[-10px] invisible group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-75 z-50">
                <div className="flex gap-2 mb-3">
                    <button className="bg-white text-black rounded-full p-1 hover:bg-gray-200 transition">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                    <button className="border-2 border-gray-500 text-gray-300 rounded-full p-1 hover:border-white hover:text-white transition">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                    <button className="border-2 border-gray-500 text-gray-300 rounded-full p-1 ml-auto hover:border-white hover:text-white transition">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-2 text-xs font-bold">
                    <span className="text-green-400">{item.match}% Match</span>
                    <span className="border border-gray-500 px-1 text-gray-400">{item.age}+</span>
                    <span className="text-gray-400">{item.duration}</span>
                    <span className="border border-gray-500 text-[10px] px-1 text-gray-400">HD</span>
                </div>

                <div className="flex gap-2 flex-wrap mb-2">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-gray-300 text-[10px] font-medium flex items-center">
                            {idx > 0 && <span className="text-gray-600 mr-2">•</span>}
                            {tag}
                        </span>
                    ))}
                </div>

                <h4 className="text-white text-sm font-bold">{item.title}</h4>
            </div>
        </div>
    );
};

export default ContentCard;
