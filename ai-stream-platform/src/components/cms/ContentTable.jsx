import React from 'react';
import { Link } from 'react-router-dom';

const ContentTable = ({ videos, onDelete }) => {
    if (videos.length === 0) {
        return (
            <div className="p-12 text-center text-neutral-500">
                No videos found. Create your first one!
            </div>
        );
    }

    return (
        <table className="w-full text-left">
            <thead className="bg-neutral-950/50 text-neutral-400 text-sm uppercase tracking-wider border-b border-neutral-800">
                <tr>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
                {videos.map((video) => (
                    <tr key={video.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt="" className="w-16 h-10 object-cover rounded bg-neutral-800" />
                                ) : (
                                    <div className="w-16 h-10 bg-neutral-800 rounded flex items-center justify-center text-xs text-neutral-600">No Img</div>
                                )}
                                <div className="font-medium text-white">{video.title || "Untitled"}</div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-300">{video.category || "Uncategorized"}</td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                Published
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                            <Link
                                to={`/studio/edit/${video.id}`}
                                className="text-neutral-400 hover:text-white text-sm font-medium"
                            >
                                Edit
                            </Link>
                            <button
                                onClick={() => onDelete(video.id)}
                                className="text-red-500 hover:text-red-400 text-sm font-medium ml-4"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ContentTable;
