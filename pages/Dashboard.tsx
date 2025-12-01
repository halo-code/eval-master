import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, FileText, ArrowRight, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Task, TaskMode } from '../types';
import { Button } from '../components/Button';

export const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [progressData, setProgressData] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedTasks = storageService.getTasks();
    // Sort by newest first
    loadedTasks.sort((a, b) => b.createdAt - a.createdAt);
    setTasks(loadedTasks);

    // Calculate progress
    const progressMap: Record<string, number> = {};
    loadedTasks.forEach(task => {
      const evals = storageService.getEvaluations(task.id);
      const completedCount = Object.keys(evals).length;
      progressMap[task.id] = completedCount;
    });
    setProgressData(progressMap);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    if (window.confirm('Are you sure you want to delete this task? All data will be lost.')) {
      storageService.deleteTask(id);
      loadData();
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Evaluations</h1>
          <p className="text-gray-500 mt-1">Manage and track your expert evaluation tasks.</p>
        </div>
        <Link to="/create">
          <Button icon={<Plus size={18} />}>New Task</Button>
        </Link>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search tasks..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new evaluation task.</p>
            <div className="mt-6">
              <Link to="/create">
                <Button variant="secondary" size="sm" icon={<Plus size={16} />}>Create Task</Button>
              </Link>
            </div>
          </div>
        ) : (
          filteredTasks.map(task => {
            const completed = progressData[task.id] || 0;
            const total = task.records.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.mode === TaskMode.SCORING ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {task.mode === TaskMode.SCORING ? 'Scoring' : 'Comparison'}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(task.id, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <h3 className="mt-3 text-lg font-semibold text-gray-900 line-clamp-1">{task.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm font-medium text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{completed}/{total} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center rounded-b-lg">
                   <Link to={`/results/${task.id}`} className="text-sm font-medium text-gray-600 hover:text-blue-600 flex items-center">
                    <BarChart2 size={16} className="mr-1" /> Results
                  </Link>
                  <Link to={`/evaluate/${task.id}`}>
                    <Button size="sm" icon={<ArrowRight size={16} />}>
                      {percent === 100 ? 'Review' : 'Continue'}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};