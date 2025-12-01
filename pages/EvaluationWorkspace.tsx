import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Task, TaskMode, EvaluationResult } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/Button';
import { ChevronLeft, ChevronRight, Save, CheckCircle, AlertCircle, Code, AlignLeft, ArrowLeft, Copy, Check } from 'lucide-react';

// --- Improved Content Rendering Components ---

// A component to recursively render JSON data in a user-friendly way
const PrettyViewer: React.FC<{ data: any; level?: number }> = ({ data, level = 0 }) => {
  if (data === null || data === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  // Primitive types
  if (typeof data === 'string') {
    return <div className="whitespace-pre-wrap leading-relaxed text-gray-800">{data}</div>;
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    return <span className="font-mono font-bold text-blue-600">{String(data)}</span>;
  }

  // Arrays
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400">[]</span>;
    return (
      <ul className="list-disc list-outside pl-5 space-y-2 mt-1">
        {data.map((item, index) => (
          <li key={index} className="text-gray-800">
            <PrettyViewer data={item} level={level + 1} />
          </li>
        ))}
      </ul>
    );
  }

  // Objects
  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-gray-400">{'{}'}</span>;

    return (
      <div className={`flex flex-col gap-3 ${level > 0 ? 'mt-1' : ''}`}>
        {entries.map(([key, value]) => {
          // Special Styling for common LLM fields
          const isThought = ['thought', 'reasoning', 'thinking', 'scratchpad'].includes(key.toLowerCase());
          const isCode = ['code', 'snippet'].includes(key.toLowerCase());
          const isResponse = ['response', 'answer', 'output', 'text', 'content'].includes(key.toLowerCase());

          let containerStyle = "border-l-2 pl-3 py-1";
          let labelStyle = "text-xs font-bold uppercase tracking-wider mb-1 block";
          let valueContainerStyle = "";

          if (isThought) {
            containerStyle = "bg-gray-50 border border-gray-200 rounded p-3";
            labelStyle = "text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2";
            valueContainerStyle = "text-gray-600 italic text-sm";
          } else if (isResponse) {
             containerStyle = "pl-0 py-2"; // Remove left border for main response to make it full width/cleaner
             labelStyle = "text-xs font-bold text-blue-600 uppercase bg-blue-50 inline-block px-2 py-0.5 rounded mb-2";
             valueContainerStyle = "text-base text-gray-900";
          } else if (isCode) {
             containerStyle = "border-l-2 border-purple-200 pl-3 bg-slate-50 rounded-r";
             labelStyle = "text-xs font-bold text-purple-600 uppercase mb-1";
             valueContainerStyle = "font-mono text-sm bg-slate-800 text-slate-100 p-2 rounded overflow-x-auto";
          } else {
             // Default generic field
             containerStyle = "border-l-2 border-gray-200 pl-3 hover:border-blue-300 transition-colors";
             labelStyle = "text-xs font-bold text-gray-500 uppercase mb-1";
          }

          return (
            <div key={key} className={containerStyle}>
              <span className={labelStyle}>
                {key.replace(/_/g, ' ')}
              </span>
              <div className={valueContainerStyle}>
                <PrettyViewer data={value} level={level + 1} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(data)}</span>;
};

const ContentRenderer: React.FC<{ content: any; label: string; className?: string }> = ({ content, label, className = "" }) => {
  const [isJsonView, setIsJsonView] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Analyze content type
  const { isJson, formattedContent } = useMemo(() => {
    if (content === null || content === undefined) return { isJson: false, formattedContent: '' };
    
    // If it's already an object/array
    if (typeof content === 'object') {
      return { isJson: true, formattedContent: content };
    }

    // If it's a string, try to parse it
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          return { isJson: true, formattedContent: parsed };
        }
      } catch (e) {
        // Not valid JSON, ignore
      }
    }
    
    return { isJson: false, formattedContent: String(content) };
  }, [content]);

  // If simple string, default to false. If object, default to Pretty View (which is !isJsonView logic wise in our toggle, let's align names)
  // Let's call the toggle "Raw Mode"
  const [isRawMode, setIsRawMode] = useState(false);

  const handleCopy = () => {
    const textToCopy = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center shrink-0">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide truncate pr-2">{label}</h3>
        <div className="flex items-center gap-1">
          {isJson && (
            <div className="flex bg-gray-200 rounded p-0.5 mr-1">
              <button 
                onClick={() => setIsRawMode(false)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${!isRawMode ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Formatted View"
              >
                Pretty
              </button>
              <button 
                onClick={() => setIsRawMode(true)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${isRawMode ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Raw JSON View"
              >
                Raw
              </button>
            </div>
          )}
          <button 
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
            title="Copy content"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="p-4 overflow-auto text-sm">
        {isRawMode ? (
          <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-all bg-gray-50 p-3 rounded border border-gray-100">
            {JSON.stringify(formattedContent, null, 2)}
          </pre>
        ) : (
          isJson ? (
             <PrettyViewer data={formattedContent} />
          ) : (
             <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
               {String(content)}
             </div>
          )
        )}
      </div>
    </div>
  );
};

export const EvaluationWorkspace: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<EvaluationResult | null>(null);
  const [savedEvaluations, setSavedEvaluations] = useState<Record<string, EvaluationResult>>({});
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    if (taskId) {
      const loadedTask = storageService.getTasks().find(t => t.id === taskId);
      if (loadedTask) {
        setTask(loadedTask);
        const evals = storageService.getEvaluations(taskId);
        setSavedEvaluations(evals);
        
        // Try to find first unevaluated record
        const firstUnevaluated = loadedTask.records.findIndex(r => !evals[r.id]);
        if (firstUnevaluated !== -1) {
          setCurrentIndex(firstUnevaluated);
        }
      } else {
        navigate('/');
      }
    }
  }, [taskId, navigate]);

  // Load current evaluation state when index changes
  useEffect(() => {
    if (!task) return;
    const record = task.records[currentIndex];
    const saved = savedEvaluations[record.id];
    
    if (saved) {
      setCurrentResult(saved);
    } else {
      // Initialize fresh result
      setCurrentResult({
        taskId: task.id,
        recordId: record.id,
        scores: task.mode === TaskMode.SCORING ? {} : undefined,
        comparisonSelection: undefined,
        comment: '',
        updatedAt: Date.now()
      });
    }
    setIsSaved(true);
  }, [currentIndex, task, savedEvaluations]);

  const handleSave = () => {
    if (!task || !currentResult) return;
    
    storageService.saveEvaluation(task.id, { ...currentResult, updatedAt: Date.now() });
    
    // Update local state map
    setSavedEvaluations(prev => ({
      ...prev,
      [currentResult.recordId]: currentResult
    }));
    setIsSaved(true);
  };

  const handleNext = () => {
    handleSave();
    if (task && currentIndex < task.records.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    handleSave();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const updateScore = (dimId: string, value: number) => {
    if (!currentResult) return;
    setCurrentResult({
      ...currentResult,
      scores: { ...currentResult.scores, [dimId]: value }
    });
    setIsSaved(false);
  };

  const updateComparison = (selection: 'left' | 'right' | 'tie') => {
    if (!currentResult) return;
    setCurrentResult({
      ...currentResult,
      comparisonSelection: selection
    });
    setIsSaved(false);
  };

  const updateComment = (text: string) => {
    if (!currentResult) return;
    setCurrentResult({
      ...currentResult,
      comment: text
    });
    setIsSaved(false);
  };

  if (!task || !currentResult) return <div>Loading...</div>;

  const currentRecord = task.records[currentIndex];
  const progress = Math.round((Object.keys(savedEvaluations).length / task.records.length) * 100);

  // Helper to get field value
  const getValue = (role: string) => {
    const mapping = task.fields.find(f => f.role === role);
    return mapping ? currentRecord.data[mapping.key] : null;
  };

  const contextFields = task.fields.filter(f => f.role === 'context');

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded text-sm font-mono border border-gray-200">
                #{currentIndex + 1}
              </span>
              <span className="truncate max-w-md" title={task.title}>{task.title}</span>
            </h2>
            <div className="w-64 mt-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm flex items-center ${isSaved ? 'text-green-600' : 'text-amber-500'} font-medium`}>
            {isSaved ? <CheckCircle size={14} className="mr-1.5" /> : <AlertCircle size={14} className="mr-1.5" />}
            {isSaved ? 'Saved' : 'Unsaved'}
          </span>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrev} disabled={currentIndex === 0}>
              <ChevronLeft size={16} className="mr-1" /> Prev
            </Button>
            <Button size="sm" onClick={handleNext} disabled={currentIndex === task.records.length - 1}>
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-hidden flex">
        
        {/* Left Panel: Split view for Context (Top) and Target (Bottom) */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-50/50">
          
          {/* Context Section (Scrollable, Limited Height) */}
          {contextFields.length > 0 && (
            <div className="shrink-0 max-h-[35vh] overflow-y-auto border-b border-gray-200 bg-white p-6 shadow-sm">
              <div className="max-w-5xl mx-auto space-y-4">
                 {contextFields.map(field => (
                  <ContentRenderer 
                    key={field.key}
                    label={field.label} 
                    content={currentRecord.data[field.key]}
                    className="border-gray-100 shadow-none"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Target / Model Output Section (Takes remaining height) */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="max-w-5xl mx-auto space-y-6">
              
              {task.mode === TaskMode.SCORING && (
                <div className="h-full">
                  <ContentRenderer 
                    label={task.fields.find(f => f.role === 'target')?.label || 'Response'} 
                    content={getValue('target')} 
                    className="border-blue-100 shadow-sm ring-1 ring-blue-50 h-full"
                  />
                </div>
              )}

              {task.mode === TaskMode.COMPARISON && (
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col h-full">
                    <ContentRenderer 
                      label="Option A" 
                      content={getValue('modelA')} 
                      className="h-full border-l-4 border-l-purple-500"
                    />
                  </div>
                  <div className="flex flex-col h-full">
                    <ContentRenderer 
                      label="Option B" 
                      content={getValue('modelB')} 
                      className="h-full border-l-4 border-l-teal-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Evaluation Forms */}
        <div className="w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto p-6 shrink-0 z-10 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Evaluation</h3>

            {task.mode === TaskMode.SCORING && task.dimensions && (
              <div className="space-y-8">
                {task.dimensions.map(dim => (
                  <div key={dim.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-sm font-bold text-gray-700">{dim.name}</label>
                      <span className="text-xl font-bold text-blue-600">
                        {currentResult.scores?.[dim.id] || '-'} <span className="text-xs text-gray-400 font-normal">/ {dim.max}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 leading-snug">{dim.description}</p>
                    <input 
                      type="range" 
                      min={dim.min} 
                      max={dim.max} 
                      step={dim.step}
                      value={currentResult.scores?.[dim.id] || dim.min}
                      onChange={(e) => updateScore(dim.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-mono">
                      <span>{dim.min}</span>
                      <span>{dim.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {task.mode === TaskMode.COMPARISON && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 font-medium">Which output is better?</p>
                <div className="space-y-3">
                  {[
                    { id: 'left', label: 'Option A is Better', color: 'border-purple-500 text-purple-700 bg-purple-50' },
                    { id: 'tie', label: 'Both are Similar', color: 'border-gray-400 text-gray-700 bg-gray-50' },
                    { id: 'right', label: 'Option B is Better', color: 'border-teal-500 text-teal-700 bg-teal-50' }
                  ].map((opt) => (
                    <label 
                      key={opt.id}
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        currentResult.comparisonSelection === opt.id 
                          ? `${opt.color} shadow-sm ring-1 ring-offset-1 ring-transparent` 
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="comparison" 
                        value={opt.id}
                        checked={currentResult.comparisonSelection === opt.id}
                        onChange={() => updateComparison(opt.id as any)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 block font-bold">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments / Justification
            </label>
            <textarea 
              rows={4}
              value={currentResult.comment || ''}
              onChange={(e) => updateComment(e.target.value)}
              className="shadow-sm block w-full focus:ring-blue-500 focus:border-blue-500 sm:text-sm border border-gray-300 rounded-md p-3"
              placeholder="Explain your evaluation (optional)..."
            />
          </div>
          
          <div className="mt-6 pt-4">
            <Button onClick={handleSave} variant="primary" className="w-full h-12 text-lg shadow-md hover:shadow-lg transition-shadow" icon={<Save size={20}/>}>
              Save Progress
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};