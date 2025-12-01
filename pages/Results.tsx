import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Task, TaskMode } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/Button';
import { Download, ArrowLeft, Table } from 'lucide-react';

export const Results: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);

  useEffect(() => {
    if (taskId) {
      const t = storageService.getTasks().find(task => task.id === taskId);
      const e = storageService.getEvaluations(taskId);
      if (t) {
        setTask(t);
        // Combine records with evaluations
        const combined = t.records.map(record => ({
          record,
          result: e[record.id]
        }));
        setEvaluations(combined);
      }
    }
  }, [taskId]);

  const formatForCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    // If it's an object, stringify it
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    // Escape double quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExport = () => {
    if (!task) return;

    // Build CSV Content
    const headers = ['Record ID'];
    
    // Add Context headers
    task.fields.filter(f => f.role === 'context').forEach(f => headers.push(`Context: ${f.label}`));
    
    // Add specific headers based on mode
    if (task.mode === TaskMode.SCORING) {
      headers.push(`Target: ${task.fields.find(f => f.role === 'target')?.label || 'Target'}`);
      task.dimensions?.forEach(d => headers.push(`Score: ${d.name}`));
    } else {
      headers.push('Model A', 'Model B', 'Selection');
    }
    
    headers.push('Comments', 'Timestamp');

    const csvRows = [headers.join(',')];

    evaluations.forEach(({ record, result }) => {
      const row = [record.id];
      
      // Context Data
      task.fields.filter(f => f.role === 'context').forEach(f => {
        row.push(formatForCsv(record.data[f.key]));
      });

      if (task.mode === TaskMode.SCORING) {
        // Target Data
        const targetKey = task.fields.find(f => f.role === 'target')?.key;
        const targetVal = targetKey ? record.data[targetKey] : '';
        row.push(formatForCsv(targetVal));
        
        // Scores
        task.dimensions?.forEach(d => {
          row.push(result?.scores?.[d.id] || '');
        });
      } else {
        // Comparison Data
        const keyA = task.fields.find(f => f.role === 'modelA')?.key;
        const keyB = task.fields.find(f => f.role === 'modelB')?.key;
        const valA = keyA ? record.data[keyA] : '';
        const valB = keyB ? record.data[keyB] : '';
        
        row.push(formatForCsv(valA));
        row.push(formatForCsv(valB));
        row.push(result?.comparisonSelection || 'Pending');
      }

      row.push(formatForCsv(result?.comment || ''));
      row.push(result?.updatedAt ? new Date(result.updatedAt).toISOString() : '');

      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title.replace(/\s+/g, '_')}_results.csv`;
    a.click();
  };

  if (!task) return <div>Loading...</div>;

  const completedCount = evaluations.filter(e => e.result).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="secondary" size="sm" icon={<ArrowLeft size={16} />}>Dashboard</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title} - Results</h1>
            <p className="text-sm text-gray-500">
              Completed {completedCount} of {task.records.length} records
            </p>
          </div>
        </div>
        <Button onClick={handleExport} icon={<Download size={18} />}>Export CSV</Button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record ID</th>
                {task.mode === TaskMode.SCORING ? (
                   task.dimensions?.map(d => (
                     <th key={d.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       {d.name}
                     </th>
                   ))
                ) : (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selection</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {evaluations.map(({ record, result }) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Done
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.id.substring(0, 8)}...
                  </td>
                  
                  {task.mode === TaskMode.SCORING ? (
                    task.dimensions?.map(d => (
                      <td key={d.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result?.scores?.[d.id] ?? '-'}
                      </td>
                    ))
                  ) : (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                      {result?.comparisonSelection === 'left' ? 'Option A' : 
                       result?.comparisonSelection === 'right' ? 'Option B' : 
                       result?.comparisonSelection === 'tie' ? 'Tie' : '-'}
                    </td>
                  )}
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                    {result?.comment || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};