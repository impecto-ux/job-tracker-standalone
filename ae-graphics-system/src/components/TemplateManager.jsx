import React, { useState } from 'react';

const FIELD_TYPES = [
    { value: 'text', label: 'Text Field' },
    { value: 'image', label: 'Image Upload' },
    { value: 'number', label: 'Number' },
];

function TemplateManager({ templates, setTemplates }) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, name: '', fields: [] });

    const handleSave = () => {
        if (!currentTemplate.name) return;

        const newTemplate = {
            ...currentTemplate,
            id: currentTemplate.id || Date.now().toString(),
            updatedAt: new Date().toISOString(),
        };

        if (currentTemplate.id) {
            setTemplates(templates.map(t => t.id === newTemplate.id ? newTemplate : t));
        } else {
            setTemplates([...templates, newTemplate]);
        }

        setIsEditing(false);
        setCurrentTemplate({ id: null, name: '', fields: [] });
    };

    const addField = () => {
        setCurrentTemplate({
            ...currentTemplate,
            fields: [
                ...currentTemplate.fields,
                { id: Date.now().toString(), type: 'text', label: '', width: '', height: '' }
            ]
        });
    };

    const updateField = (index, updates) => {
        const newFields = [...currentTemplate.fields];
        newFields[index] = { ...newFields[index], ...updates };
        setCurrentTemplate({ ...currentTemplate, fields: newFields });
    };

    const removeField = (index) => {
        const newFields = currentTemplate.fields.filter((_, i) => i !== index);
        setCurrentTemplate({ ...currentTemplate, fields: newFields });
    };

    const deleteTemplate = (id) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    if (isEditing) {
        return (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">
                        {currentTemplate.id ? 'Edit Template' : 'New Template'}
                    </h2>
                    <div className="space-x-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-lg shadow-blue-500/20"
                        >
                            Save Template
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Template Name</label>
                        <input
                            type="text"
                            value={currentTemplate.name}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            placeholder="e.g. VS Screen 2024"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-400">Fields Definition</label>
                            <button
                                onClick={addField}
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                + Add Field
                            </button>
                        </div>

                        {currentTemplate.fields.map((field, index) => (
                            <div key={field.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex gap-4 items-start animate-fade-in group">
                                <div className="flex-1 space-y-3">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 mb-1 block">Label</label>
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => updateField(index, { label: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm focus:border-blue-500 outline-none"
                                                placeholder="Field Label"
                                            />
                                        </div>
                                        <div className="w-40">
                                            <label className="text-xs text-gray-500 mb-1 block">Type</label>
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateField(index, { type: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm focus:border-blue-500 outline-none"
                                            >
                                                {FIELD_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {field.type === 'image' && (
                                        <div className="flex gap-4 items-center bg-gray-800/50 p-2 rounded border border-gray-700/50">
                                            <span className="text-xs text-gray-400 font-medium">Validation:</span>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Width:</span>
                                                <input
                                                    type="number"
                                                    value={field.width}
                                                    onChange={(e) => updateField(index, { width: e.target.value })}
                                                    className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
                                                    placeholder="px"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Height:</span>
                                                <input
                                                    type="number"
                                                    value={field.height}
                                                    onChange={(e) => updateField(index, { height: e.target.value })}
                                                    className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
                                                    placeholder="px"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => removeField(index)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                                    title="Remove Field"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Templates</h2>
                    <p className="text-gray-400">Manage your graphics templates and data schemas.</p>
                </div>
                <button
                    onClick={() => {
                        setCurrentTemplate({ id: null, name: '', fields: [] });
                        setIsEditing(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Template
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                    <div key={template.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition group">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                                {template.name}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setCurrentTemplate(template);
                                        setIsEditing(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => deleteTemplate(template.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fields</div>
                            <div className="flex flex-wrap gap-2">
                                {template.fields.length === 0 && <span className="text-sm text-gray-600 italic">No fields defined</span>}
                                {template.fields.map(field => (
                                    <span key={field.id} className="px-2 py-1 bg-gray-900 rounded text-xs text-gray-300 border border-gray-700">
                                        {field.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                            <span>{template.fields.length} fields</span>
                            <span>Updated: {new Date(template.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No templates yet</p>
                        <p className="text-sm">Create your first template to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TemplateManager;
