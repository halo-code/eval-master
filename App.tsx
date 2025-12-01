import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CreateTask } from './pages/CreateTask';
import { EvaluationWorkspace } from './pages/EvaluationWorkspace';
import { Results } from './pages/Results';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateTask />} />
          <Route path="/evaluate/:taskId" element={<EvaluationWorkspace />} />
          <Route path="/results/:taskId" element={<Results />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;