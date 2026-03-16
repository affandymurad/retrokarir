import React, { useState } from 'react';
import { useDarkMode } from './hooks/useDarkMode';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import FormPage from './pages/FormPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  const { isDark, toggle } = useDarkMode();
  const [page, setPage] = useState('landing'); // landing | form | result
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);
  const [aiMode, setAiMode] = useState('gemini');

  const toggleAi = () => setAiMode(m => m === 'gemini' ? 'ollama' : 'gemini');

  const handleFormSubmit = (data, userData) => {
    setResult(data);
    setMeta(userData);
    setPage('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="noise-overlay" />
      <Navbar
        isDark={isDark}
        onToggleDark={toggle}
        aiMode={aiMode}
        onToggleAi={toggleAi}
        onHome={() => setPage("landing")}
      />
      {page === 'landing' && (
        <LandingPage onStart={() => setPage('form')} />
      )}
      {page === 'form' && (
        <FormPage
          onSubmit={handleFormSubmit}
          aiMode={aiMode}
        />
      )}
      {page === 'result' && (
        <ResultPage
          result={result}
          meta={meta}
          onBack={() => setPage('form')}
        />
      )}
    </>
  );
}
