import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addVideo, getVideos, updateVideo } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // Need direct db access for single fetch if not in helper

const VideoEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Action',
        thumbnailUrl: '',
        videoUrl: '',
        duration: '',
        rating: 'PG-13'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEditing) {
            fetchVideo();
        }
    }, [id]);

    const fetchVideo = async () => {
        // Ideally move this to firebase.js helper as getVideo(id)
        try {
            const docRef = doc(db, "videos", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setFormData(docSnap.data());
            } else {
                setError("Video not found");
            }
        } catch (err) {
            setError("Failed to fetch video details");
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEditing) {
                await updateVideo(id, formData);
            } else {
                await addVideo(formData);
            }
            navigate('/studio');
        } catch (err) {
            console.error(err);
            setError('Failed to save video. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">
                    {isEditing ? 'Edit Video' : 'New Video'}
                </h1>
                <button
                    onClick={() => navigate('/studio')}
                    className="text-neutral-400 hover:text-white"
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 space-y-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Cyberpunk City Run"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                            >
                                <option>Action</option>
                                <option>Sci-Fi</option>
                                <option>Drama</option>
                                <option>Documentary</option>
                                <option>Comedy</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Rating</label>
                            <select
                                name="rating"
                                value={formData.rating}
                                onChange={handleChange}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                            >
                                <option>G</option>
                                <option>PG</option>
                                <option>PG-13</option>
                                <option>R</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Thumbnail URL</label>
                        <input
                            type="url"
                            name="thumbnailUrl"
                            value={formData.thumbnailUrl}
                            onChange={handleChange}
                            placeholder="https://..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Video URL (mp4 or stream)</label>
                        <input
                            type="url"
                            name="videoUrl"
                            value={formData.videoUrl}
                            onChange={handleChange}
                            placeholder="https://..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-neutral-800 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/studio')}
                        className="px-6 py-3 text-neutral-400 hover:text-white font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update Video' : 'Create Video')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default VideoEditor;
