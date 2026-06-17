// src/components/RegisterPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  useEffect(() => { usernameRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate('/arena');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { level: 1, label: 'Weak', color: '#ff4757' };
    if (password.length < 10) return { level: 2, label: 'Fair', color: '#ffa502' };
    if (password.match(/[A-Z]/) && password.match(/[0-9]/)) return { level: 4, label: 'Strong', color: '#00ff87' };
    return { level: 3, label: 'Good', color: '#00f5ff' };
  };
  const strength = passwordStrength();

  return (
    <div className="auth-page">
      <div className="cyber-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
        {isDark ? '☀️' : '🌙'}
      </button>

      <div className="auth-container animate-fadeInUp">
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <span className="font-display" style={{ fontSize: '1.1rem', letterSpacing: '0.12em', color: 'var(--neon-cyan)' }}>
            DEBATE ARENA
          </span>
        </div>

        <div className="auth-card glass-card">
          <div className="auth-header">
            <h1 className="auth-title">Join the Arena</h1>
            <p className="auth-subtitle">Create your account to witness AI debates.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="register-form">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username</label>
              <input
                ref={usernameRef}
                id="reg-username"
                type="text"
                className="input-field"
                placeholder="YourArenaName"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                minLength={3}
                maxLength={30}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
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
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="input-field"
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {strength && (
                <div className="password-strength animate-fadeIn">
                  <div className="strength-bars">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="strength-bar"
                        style={{
                          background: i <= strength.level ? strength.color : 'var(--border-subtle)',
                          transition: 'background 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <input
                id="reg-confirm"
                type="password"
                className="input-field"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  borderColor: confirmPassword && confirmPassword !== password
                    ? '#ff4757'
                    : confirmPassword && confirmPassword === password
                    ? '#00ff87'
                    : undefined,
                }}
              />
            </div>

            {error && (
              <div className="error-alert animate-fadeIn" role="alert">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <><div className="spinner" /> Creating Account…</>
              ) : (
                <><span>🚀</span> Launch into Arena</>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link" id="go-to-login">
                Sign In →
              </Link>
            </p>
          </div>
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
        .orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
        .orb-1 { width: 400px; height: 400px; top: -100px; right: -100px; background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%); animation: glowPulse 4s ease-in-out infinite; }
        .orb-2 { width: 500px; height: 500px; bottom: -150px; left: -100px; background: radial-gradient(circle, rgba(0,245,255,0.1) 0%, transparent 70%); animation: glowPulse 6s ease-in-out infinite reverse; }
        .theme-toggle-btn { position: fixed; top: 20px; right: 20px; width: 44px; height: 44px; background: var(--bg-surface); border: 1px solid var(--border-glass); border-radius: 50%; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; backdrop-filter: var(--glass-blur); transition: all 0.3s ease; z-index: 100; }
        .theme-toggle-btn:hover { border-color: var(--neon-cyan); box-shadow: var(--neon-cyan-glow); transform: scale(1.1); }
        .auth-container { width: 100%; max-width: 440px; display: flex; flex-direction: column; align-items: center; gap: 24px; position: relative; z-index: 1; }
        .auth-logo { display: flex; align-items: center; gap: 12px; }
        .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, var(--neon-cyan), #0066ff); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: var(--shadow-button); }
        .auth-card { width: 100%; padding: 40px 36px; }
        .auth-header { text-align: center; margin-bottom: 32px; }
        .auth-title { font-size: 1.8rem; color: var(--text-bright); margin-bottom: 8px; }
        .auth-subtitle { color: var(--text-secondary); font-size: 0.9rem; }
        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); letter-spacing: 0.02em; }
        .password-strength { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .strength-bars { display: flex; gap: 4px; flex: 1; }
        .strength-bar { height: 4px; flex: 1; border-radius: 2px; }
        .error-alert { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3); border-radius: 8px; color: #ff4757; font-size: 0.875rem; }
        .auth-footer { margin-top: 24px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; }
        .auth-link { color: var(--neon-cyan); text-decoration: none; font-weight: 500; transition: opacity 0.2s; }
        .auth-link:hover { opacity: 0.8; }
      `}</style>
    </div>
  );
};

export default RegisterPage;
