import React, { useState, useRef } from 'react';

function DataEntry({ templates }) {
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    const handleInputChange = (label, value) => {
        setFormData(prev => ({
            ...prev,
            [label]: value
        }));
    };

    const handleImageUpload = (field, file) => {
        if (!file) return;

        // Reset error for this field
        const newErrors = { ...errors };
        delete newErrors[field.label];
        setErrors(newErrors);

        // Validate dimensions if specified
        if (field.width || field.height) {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                const requiredWidth = field.width ? parseInt(field.width) : null;
                const requiredHeight = field.height ? parseInt(field.height) : null;

                let errorMsg = '';
                if (requiredWidth && img.width !== requiredWidth) {
                    errorMsg += `Invalid width: ${img.width}px (Required: ${requiredWidth}px). `;
                }
                if (requiredHeight && img.height !== requiredHeight) {
                    errorMsg += `Invalid height: ${img.height}px (Required: ${requiredHeight}px).`;
                }

                if (errorMsg) {
                    setErrors(prev => ({ ...prev, [field.label]: errorMsg }));
                    // Clear the invalid file from form data
                    handleInputChange(field.label, '');
                } else {
                    // Valid image, store filename (or path if we could, but browser security prevents full path)
                    // Ideally we store the filename and the user ensures the file is in the asset folder.
                    handleInputChange(field.label, file.name);
                }
                URL.revokeObjectURL(objectUrl);
            };

            img.src = objectUrl;
        } else {
            // No validation needed
            handleInputChange(field.label, file.name);
        }
    };

    const downloadJson = () => {
        if (!selectedTemplate) return;

        const exportData = {
            templateName: selectedTemplate.name,
            generatedAt: new Date().toISOString(),
            data: formData
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${selectedTemplate.name.replace(/\s+/g, '_')}_data.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Template to Fill</label>
                <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        setFormData({});
                        setErrors({});
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-lg"
                >
                    <option value="">-- Choose a Template --</option>
                    {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            {selectedTemplate && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span className="text-blue-500">📝</span> Data Entry: {selectedTemplate.name}
                        </h2>
                    </div>

                    <div className="p-6 space-y-6">
                        {selectedTemplate.fields.map((field) => (
                            <div key={field.id} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    {field.label}
                                    {field.type === 'image' && (field.width || field.height) && (
                                        <span className="ml-2 text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-700">
                                            Required: {field.width || '?'}x{field.height || '?'}
                                        </span>
                                    )}
                                </label>

                                {field.type === 'image' ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-4">
                                            <label className="flex-1 cursor-pointer group">
                                                <div className={`
                          flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg 
                          transition-colors duration-200
                          ${errors[field.label]
                                                        ? 'border-red-500 bg-red-500/5'
                                                        : formData[field.label]
                                                            ? 'border-green-500 bg-green-500/5'
                                                            : 'border-gray-600 bg-gray-900 hover:bg-gray-800 hover:border-gray-500'
                                                    }
                        `}>
                                                    {formData[field.label] ? (
                                                        <div className="text-center">
                                                            <span className="text-2xl mb-2 block">✅</span>
                                                            <p className="text-sm text-green-400 font-medium">{formData[field.label]}</p>
                                                            <p className="text-xs text-gray-500 mt-1">Click to replace</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <svg className="w-8 h-8 mb-3 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                            </svg>
                                                            <p className="text-sm text-gray-400 group-hover:text-gray-300">Click to upload image</p>
                                                        </div>
                                                    )}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(field, e.target.files[0])}
                                                    />
                                                </div>
                                            </label>
                                        </div>
                                        {errors[field.label] && (
                                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                {errors[field.label]}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <input
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        value={formData[field.label] || ''}
                                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        placeholder={`Enter ${field.label}`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-gray-700 bg-gray-800/50 flex justify-end">
                        <button
                            onClick={downloadJson}
                            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-lg shadow-lg shadow-green-500/20 transition flex items-center gap-2 transform hover:scale-105 active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download JSON Data
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataEntry;
