// src/components/LoginPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/arena');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="cyber-grid" />

      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Theme toggle */}
      <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
        {isDark ? '☀️' : '🌙'}
      </button>

      <div className="auth-container animate-fadeInUp">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <span className="font-display" style={{ fontSize: '1.1rem', letterSpacing: '0.12em', color: 'var(--neon-cyan)' }}>
            DEBATE ARENA
          </span>
        </div>

        <div className="auth-card glass-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Enter the arena. Witness AI minds clash.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                className="input-field"
                placeholder="agent@arena.ai"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="error-alert animate-fadeIn" role="alert">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <><div className="spinner" /> Authenticating…</>
              ) : (
                <>
                  <span>🔐</span> Enter Arena
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              New to the arena?{' '}
              <Link to="/register" className="auth-link" id="go-to-register">
                Create Account →
              </Link>
            </p>
          </div>
        </div>

        {/* Features preview */}
        <div className="auth-features">
          {[
            { icon: '🔬', label: 'Researcher AI' },
            { icon: '⚡', label: 'Critic AI' },
            { icon: '🧠', label: 'Synthesizer AI' },
          ].map(f => (
            <div key={f.label} className="feature-chip">
              <span>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          background: var(--bg-void);
        }

        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 400px; height: 400px;
          top: -100px; left: -100px;
          background: radial-gradient(circle, rgba(0,245,255,0.12) 0%, transparent 70%);
          animation: glowPulse 4s ease-in-out infinite;
        }

        .orb-2 {
          width: 500px; height: 500px;
          bottom: -150px; right: -100px;
          background: radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%);
          animation: glowPulse 6s ease-in-out infinite reverse;
        }

        .theme-toggle-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 44px;
          height: 44px;
          background: var(--bg-surface);
          border: 1px solid var(--border-glass);
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: var(--glass-blur);
          transition: all 0.3s ease;
          z-index: 100;
        }

        .theme-toggle-btn:hover {
          border-color: var(--neon-cyan);
          box-shadow: var(--neon-cyan-glow);
          transform: scale(1.1);
        }

        .auth-container {
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          position: relative;
          z-index: 1;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, var(--neon-cyan), #0066ff);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          box-shadow: var(--shadow-button);
        }

        .auth-card {
          width: 100%;
          padding: 40px 36px;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-title {
          font-size: 1.8rem;
          color: var(--text-bright);
          margin-bottom: 8px;
        }

        .auth-subtitle {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255, 71, 87, 0.1);
          border: 1px solid rgba(255, 71, 87, 0.3);
          border-radius: 8px;
          color: #ff4757;
          font-size: 0.875rem;
        }

        .auth-footer {
          margin-top: 24px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .auth-link {
          color: var(--neon-cyan);
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .auth-link:hover { opacity: 0.8; }

        .auth-features {
          display: flex;
          gap: 10px;
        }

        .feature-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          backdrop-filter: var(--glass-blur);
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
