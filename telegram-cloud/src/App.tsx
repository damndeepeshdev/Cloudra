import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './index.css';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const isAuth = await invoke<boolean>('check_auth');
        if (isAuth) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {isAuthenticated ? (
        <Dashboard />
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Auth onLogin={() => setIsAuthenticated(true)} />
        </div>
      )}
    </div>
  );
}

export default App;
