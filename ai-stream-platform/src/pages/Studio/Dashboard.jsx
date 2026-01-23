import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVideos, deleteVideo } from '../../firebase';
import ContentTable from '../../components/cms/ContentTable';

const Dashboard = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchVideos = async () => {
        setLoading(true);
        const data = await getVideos();
        setVideos(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this video?")) {
            await deleteVideo(id);
            fetchVideos(); // Refresh list
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Content Dashboard</h1>
                    <p className="text-neutral-400">Manage your platform's video content.</p>
                </div>
                <Link
                    to="/studio/create"
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    New Video
                </Link>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-neutral-500">Loading content...</div>
                ) : (
                    <ContentTable videos={videos} onDelete={handleDelete} />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
