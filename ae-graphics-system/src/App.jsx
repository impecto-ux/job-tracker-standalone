import React, { useState, useEffect } from 'react';
import TemplateManager from './components/TemplateManager';
import DataEntry from './components/DataEntry';

function App() {
  const [activeTab, setActiveTab] = useState('entry');
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('ae_templates');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ae_templates', JSON.stringify(templates));
  }, [templates]);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-purple-500 selection:text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">AE</span>
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Graphics Automation
              </h1>
            </div>

            <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('entry')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'entry'
                    ? 'bg-gray-700 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Data Entry
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'templates'
                    ? 'bg-gray-700 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Template Config
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'templates' && (
          <TemplateManager templates={templates} setTemplates={setTemplates} />
        )}
        {activeTab === 'entry' && (
          <DataEntry templates={templates} />
        )}
      </main>
    </div>
  );
}

export default App;
