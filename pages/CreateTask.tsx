import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileJson, ArrowLeft, Check, AlertCircle, Trash } from 'lucide-react';
import { Task, TaskMode, FieldMapping, Dimension, TaskRecord } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/Button';
import { v4 as uuidv4 } from 'uuid'; // We'll implement a simple ID generator since uuid lib might not be available
import { Link } from 'react-router-dom';

// Simple ID generator to avoid dependencies
const generateId = () => Math.random().toString(36).substr(2, 9);

export const CreateTask: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<TaskMode>(TaskMode.SCORING);

  // Step 2: Data Import
  const [rawRecords, setRawRecords] = useState<TaskRecord[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  
  // Step 3: Configuration
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([
    { id: generateId(), name: 'Overall Quality', description: 'General assessment of the output', min: 0, max: 5, step: 0.5 }
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error("Uploaded file must be a JSON array of objects.");
        }
        
        // Normalize records
        const records: TaskRecord[] = json.map(item => ({
          // Ensure ID is a string if present to avoid type mismatch issues later
          id: item.id != null ? String(item.id) : generateId(),
          data: item
        }));

        setRawRecords(records);
        
        // Extract keys from first record
        if (records.length > 0) {
          const keys = Object.keys(records[0].data);
          setAvailableKeys(keys);
          
          // Pre-populate mappings based on keys
          const initialMappings: FieldMapping[] = keys.map(key => {
            // Auto-detect common roles
            let role: FieldMapping['role'] = 'ignore';
            const k = key.toLowerCase();
            if (['input', 'prompt', 'query', 'question', 'context'].some(s => k.includes(s))) role = 'context';
            else if (mode === TaskMode.SCORING && ['target', 'response', 'output', 'answer'].some(s => k.includes(s))) role = 'target';
            else if (mode === TaskMode.COMPARISON && (k === 'modela' || k === 'outputa' || k.endsWith('_a'))) role = 'modelA';
            else if (mode === TaskMode.COMPARISON && (k === 'modelb' || k === 'outputb' || k.endsWith('_b'))) role = 'modelB';

            return {
              key,
              role, 
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
            };
          });
          setFieldMappings(initialMappings);
        }
        
        setError(null);
      } catch (err) {
        setError("Invalid JSON file. Please ensure it is a valid JSON array.");
      }
    };
    reader.readAsText(file);
  };

  const handleCreateTask = () => {
    // Validation
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    
    // Check mappings
    if (mode === TaskMode.COMPARISON) {
      const hasModelA = fieldMappings.some(f => f.role === 'modelA');
      const hasModelB = fieldMappings.some(f => f.role === 'modelB');
      if (!hasModelA || !hasModelB) {
        setError("For comparison mode, you must map at least 'Model A' and 'Model B' fields.");
        return;
      }
    } else {
      const hasTarget = fieldMappings.some(f => f.role === 'target');
      if (!hasTarget) {
         // It's technically okay to only have context, but usually you want a target to score
      }
    }

    const newTask: Task = {
      id: generateId(),
      title,
      description,
      mode,
      createdAt: Date.now(),
      fields: fieldMappings.filter(f => f.role !== 'ignore'),
      dimensions: mode === TaskMode.SCORING ? dimensions : undefined,
      records: rawRecords
    };

    storageService.saveTask(newTask);
    navigate('/');
  };

  const addDimension = () => {
    setDimensions([...dimensions, { 
      id: generateId(), 
      name: 'New Dimension', 
      description: '', 
      min: 0, 
      max: 5, 
      step: 0.5 
    }]);
  };

  const removeDimension = (id: string) => {
    if (dimensions.length > 1) {
      setDimensions(dimensions.filter(d => d.id !== id));
    }
  };

  const updateDimension = (id: string, field: keyof Dimension, value: any) => {
    setDimensions(dimensions.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const updateMapping = (key: string, role: FieldMapping['role']) => {
    setFieldMappings(fieldMappings.map(m => m.key === key ? { ...m, role } : m));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Create Evaluation Task</h2>
        <div className="text-sm text-gray-500">Step {step} of 3</div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
            <AlertCircle className="text-red-500 mr-2 mt-0.5" size={18} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Task Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Q3 Customer Support Chatbot Evaluation"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Briefly describe the goal of this evaluation..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Mode</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${mode === TaskMode.SCORING ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setMode(TaskMode.SCORING)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Scoring Mode</span>
                    {mode === TaskMode.SCORING && <Check className="text-blue-500" size={20} />}
                  </div>
                  <p className="text-sm text-gray-500">Rate single items on multiple dimensions (e.g., 1-5 stars for Accuracy, Tone).</p>
                </div>

                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${mode === TaskMode.COMPARISON ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setMode(TaskMode.COMPARISON)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Comparison Mode</span>
                    {mode === TaskMode.COMPARISON && <Check className="text-blue-500" size={20} />}
                  </div>
                  <p className="text-sm text-gray-500">Compare two outputs side-by-side (A vs B) and choose the better one.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Import Data */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors">
              <FileJson className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">Upload Dataset</h3>
              <p className="text-sm text-gray-500 mb-4">Upload a JSON file containing an array of objects to evaluate.</p>
              <input 
                type="file" 
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mx-auto max-w-xs"
              />
              <div className="mt-4 text-xs text-gray-400">
                Tip: <a href="#" onClick={(e) => {
                  e.preventDefault();
                  
                  // Generate context-aware template based on selected mode
                  let dummyData;
                  if (mode === TaskMode.COMPARISON) {
                    dummyData = [
                      { 
                        id: "101", 
                        prompt: "Explain quantum computing", 
                        model_a: {
                          "thought": "I should explain concepts simply.",
                          "response": "Quantum computing uses qubits..."
                        }, 
                        model_b: "Quantum computers are fast..." 
                      },
                      { 
                        id: "102", 
                        prompt: "Write a haiku", 
                        model_a: "Green frog jumps quickly...", 
                        model_b: {
                          "text": "Old pond / frog jumps in...",
                          "syllables": [2, 3, 2]
                        } 
                      }
                    ];
                  } else {
                    dummyData = [
                      { 
                        id: "1", 
                        prompt: "Translate 'Hello' to Spanish", 
                        response: {
                          "translation": "Hola",
                          "confidence": 0.99
                        } 
                      },
                      { 
                        id: "2", 
                        prompt: "Write a summary", 
                        response: "This is a summary of the text." 
                      }
                    ];
                  }

                  const blob = new Blob([JSON.stringify(dummyData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `template_${mode === TaskMode.SCORING ? 'scoring' : 'comparison'}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} className="text-blue-500 underline hover:text-blue-600 cursor-pointer">
                  Download JSON Template ({mode === TaskMode.SCORING ? 'Scoring' : 'Comparison'})
                </a>
              </div>
            </div>

            {rawRecords.length > 0 && (
              <div className="bg-green-50 p-4 rounded-md flex items-center">
                <Check className="text-green-500 mr-2" />
                <span className="text-green-700 font-medium">Successfully loaded {rawRecords.length} records.</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Configuration */}
        {step === 3 && (
          <div className="space-y-8">
            {/* Field Mapping */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Map Fields</h3>
              <p className="text-sm text-gray-500 mb-4">Select how fields from your JSON should be displayed.</p>
              
              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JSON Key</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Label</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fieldMappings.map((mapping) => (
                      <tr key={mapping.key}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mapping.key}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <select 
                            value={mapping.role}
                            onChange={(e) => updateMapping(mapping.key, e.target.value as any)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            <option value="ignore">Ignore (Don't Show)</option>
                            <option value="context">Context (Read Only)</option>
                            {mode === TaskMode.SCORING && <option value="target">Target (To Evaluate)</option>}
                            {mode === TaskMode.COMPARISON && <option value="modelA">Output A (Left)</option>}
                            {mode === TaskMode.COMPARISON && <option value="modelB">Output B (Right)</option>}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input 
                            type="text" 
                            value={mapping.label}
                            onChange={(e) => {
                              const newMappings = [...fieldMappings];
                              const idx = newMappings.findIndex(m => m.key === mapping.key);
                              newMappings[idx].label = e.target.value;
                              setFieldMappings(newMappings);
                            }}
                            className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dimension Config (Scoring Only) */}
            {mode === TaskMode.SCORING && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Score Dimensions</h3>
                  <Button size="sm" variant="secondary" onClick={addDimension} icon={<Plus size={14} />}>Add Dimension</Button>
                </div>
                <div className="space-y-3">
                  {dimensions.map((dim, index) => (
                    <div key={dim.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex-1 space-y-2">
                        <input 
                          type="text" 
                          value={dim.name}
                          onChange={(e) => updateDimension(dim.id, 'name', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5"
                          placeholder="Dimension Name (e.g., Accuracy)"
                        />
                        <input 
                          type="text" 
                          value={dim.description}
                          onChange={(e) => updateDimension(dim.id, 'description', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5 text-gray-600"
                          placeholder="Short description/guide..."
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-gray-500">Max Score</label>
                        <input 
                          type="number" 
                          value={dim.max}
                          onChange={(e) => updateDimension(dim.id, 'max', parseFloat(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5"
                        />
                      </div>
                      <button 
                        onClick={() => removeDimension(dim.id)}
                        className="text-gray-400 hover:text-red-500 mt-2"
                        disabled={dimensions.length <= 1}
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
        {step > 1 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)} icon={<ArrowLeft size={16} />}>Back</Button>
        ) : (
           <Link to="/"><Button variant="ghost">Cancel</Button></Link>
        )}
        
        {step < 3 ? (
          <Button onClick={() => {
            if (step === 2 && rawRecords.length === 0) {
              setError("Please upload a file to continue.");
              return;
            }
            setError(null);
            setStep(step + 1);
          }}>Next</Button>
        ) : (
          <Button onClick={handleCreateTask} className="bg-green-600 hover:bg-green-700">Create Task</Button>
        )}
      </div>
    </div>
  );
};

// Helper component for Plus icon since it wasn't imported in CreateTask originally
const Plus = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);