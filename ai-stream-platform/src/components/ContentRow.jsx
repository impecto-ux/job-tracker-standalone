import React, { useRef } from 'react';
import ContentCard from './ContentCard';

const ContentRow = ({ title, items }) => {
    const rowRef = useRef(null);

    const scroll = (direction) => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative group px-4 sm:px-12 my-8 hover:z-50 transition-all duration-300">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 pl-1 hover:text-gray-300 transition cursor-pointer">{title}</h2>

            <div className="relative -mb-44">
                {/* Scroll Buttons - Visible on Row Hover */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-44 z-40 bg-black/50 hover:bg-black/80 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 text-white h-[calc(100%-11rem)]"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>

                <div
                    ref={rowRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-56 pt-4 -ml-4 pl-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {items.map((item, index) => (
                        <ContentCard key={index} item={item} />
                    ))}
                </div>

                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-44 z-40 bg-black/50 hover:bg-black/80 w-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 text-white h-[calc(100%-11rem)]"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
            </div>
        </div>
    );
};

export default ContentRow;
