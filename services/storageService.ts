import { Task, EvaluationResult, EvaluationMap } from '../types';

const TASKS_KEY = 'evalmaster_tasks';
const EVALUATIONS_KEY = 'evalmaster_evaluations';

export const storageService = {
  getTasks: (): Task[] => {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load tasks", e);
      return [];
    }
  },

  saveTask: (task: Task): void => {
    const tasks = storageService.getTasks();
    tasks.push(task);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  deleteTask: (taskId: string): void => {
    const tasks = storageService.getTasks().filter(t => t.id !== taskId);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    
    // Also cleanup evaluations
    const allEvaluations = storageService.getAllEvaluations();
    delete allEvaluations[taskId];
    localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(allEvaluations));
  },

  getEvaluations: (taskId: string): EvaluationMap => {
    try {
      const data = localStorage.getItem(EVALUATIONS_KEY);
      const all = data ? JSON.parse(data) : {};
      return all[taskId] || {};
    } catch (e) {
      console.error("Failed to load evaluations", e);
      return {};
    }
  },

  getAllEvaluations: (): Record<string, EvaluationMap> => {
    try {
      const data = localStorage.getItem(EVALUATIONS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  saveEvaluation: (taskId: string, result: EvaluationResult): void => {
    const all = storageService.getAllEvaluations();
    if (!all[taskId]) {
      all[taskId] = {};
    }
    all[taskId][result.recordId] = result;
    localStorage.setItem(EVALUATIONS_KEY, JSON.stringify(all));
  }
};