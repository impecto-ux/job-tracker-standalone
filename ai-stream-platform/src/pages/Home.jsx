import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import { getVideos } from '../firebase';

// Static fallbacks in case DB is empty initially
import trend1 from '../assets/trending_1_algorithm.png';
import trend2 from '../assets/trending_2_neural.png';
import trend3 from '../assets/trending_3_biosim.png';
import trend4 from '../assets/trending_4_dreams.png';
import trend5 from '../assets/trending_5_sentience.png';

const Home = () => {
    const [dbVideos, setDbVideos] = useState([]);

    useEffect(() => {
        const fetchContent = async () => {
            const videos = await getVideos();
            setDbVideos(videos);
        };
        fetchContent();
    }, []);

    const trendingContent = [
        { title: "The Algorithm", image: trend1, match: 98, age: 16, duration: "1h 45m", tags: ["Sci-Fi", "Thriller"] },
        { title: "Neural Networks", image: trend2, match: 95, age: 13, duration: "2h 10m", tags: ["Documentary", "Tech"] },
        { title: "Code of Life", image: trend3, match: 92, age: 10, duration: "55m", tags: ["Biology", "AI"] },
        { title: "Digital Dreams", image: trend4, match: 89, age: 7, duration: "1h 30m", tags: ["Animation", "Family"] },
        { title: "Sentience", image: trend5, match: 85, age: 18, duration: "45m", tags: ["Drama", "Series"] },
    ];

    // Combine static + dynamic for demo
    // In a real app we'd filter these by category from DB
    const allContent = [...dbVideos.map(v => ({
        title: v.title,
        image: v.thumbnailUrl || "https://placehold.co/600x400?text=No+Image",
        match: 90, // mock
        age: v.rating === 'R' ? 18 : 13,
        duration: v.duration || "1h",
        tags: [v.category]
    })), ...trendingContent];

    const popularContent = [
        { title: "Deep Blue", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&q=80", match: 99, age: 12, duration: "148m", tags: ["History", "Chess"] },
        { title: "AlphaGo", image: "https://images.unsplash.com/photo-1504384308090-c54be3853247?w=500&q=80", match: 97, age: 7, duration: "1h 30m", tags: ["Strategy", "Go"] },
        { title: "Generative Future", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&q=80", match: 94, age: 16, duration: "2h", tags: ["Futuristic", "Doc"] },
        { title: "Silicon Soul", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&q=80", match: 91, age: 13, duration: "1h 50m", tags: ["Sci-Fi", "Romance"] },
    ];

    const newReleases = [
        { title: "GPT-4: The Movie", image: "https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=500&q=80", match: 96, age: 13, duration: "1h 20m", tags: ["Tech", "Comedy"] },
        { title: "Vision Pro", image: "https://images.unsplash.com/photo-1625314876454-e608779b9776?w=500&q=80", match: 93, age: 10, duration: "40m", tags: ["Reality", "Series"] },
    ];

    return (
        <div className="app">
            <Navbar />
            <Hero />
            <div className="content-rows" style={{ marginTop: '-150px', position: 'relative', zIndex: 20 }}>
                {/* If we have DB videos, show them at the top as "Recently Added" */}
                {dbVideos.length > 0 && (
                    <ContentRow
                        title="Fresh from Studio"
                        items={dbVideos.map(v => ({
                            title: v.title,
                            image: v.thumbnailUrl || "https://placehold.co/600x400?text=No+Image",
                            match: 100,
                            age: 12,
                            duration: v.duration || "N/A",
                            tags: [v.category]
                        }))}
                    />
                )}

                <ContentRow title="Trending Now in AI" items={allContent} />
                <ContentRow title="Generative Masterpieces" items={popularContent} />
                <ContentRow title="New Releases" items={newReleases} />
            </div>
            <footer style={{ padding: '50px 0', textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>
                <p>© 2026 AI FLIX - The Singular Streaming Experience</p>
            </footer>
        </div>
    );
};

export default Home;
