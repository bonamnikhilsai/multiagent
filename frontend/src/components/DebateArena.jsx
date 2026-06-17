// src/components/DebateArena.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import AgentTimeline from './AgentTimeline';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
const GATEWAY_URL = 'http://localhost:3001';
const EXAMPLE_QUERIES = [
    'Should I use GraphQL or REST API for a high-traffic mobile app with 1M+ users?',
    'Microservices vs Monolith for a fintech startup that needs to scale fast?',
    'PostgreSQL vs MongoDB for a real-time analytics dashboard with complex joins?',
    'Redis vs Kafka for event-driven architecture in an e-commerce platform?',
    'Kubernetes vs serverless (AWS Lambda) for a ML inference service at scale?',
    'CQRS + Event Sourcing vs traditional CRUD for a high-volume banking system?',
];
const AGENT_ROSTER = [
    {
        role: 'researcher',
        icon: '🔬',
        name: 'Researcher',
        fullName: 'Senior Solution Architect',
        desc: 'Optimistic Advocate',
        model: 'MODEL_1',
        systemPrompt: 'Topic, Key Advantages, Defense, Recommendation, Confidence',
    },
    {
        role: 'critic',
        icon: '⚡',
        name: 'Critic',
        fullName: 'Principal Systems Reviewer',
        desc: 'Aggressive Reviewer',
        model: 'MODEL_2',
        systemPrompt: 'Topic, Targeted Claim, Counter Args, Risks, Risk Severity',
    },
    {
        role: 'synthesizer',
        icon: '🧠',
        name: 'Synthesizer',
        fullName: 'Principal AI Architect & Judge',
        desc: 'Supreme Judge + Code Generator',
        model: 'MODEL_3',
        systemPrompt: 'Winner, Final Verdict, JS Boilerplate, Implementation Roadmap',
    },
];
const DebateArena = () => {
    const { user, token, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [query, setQuery] = useState('');
    const [isDebating, setIsDebating] = useState(false);
    const [turns, setTurns] = useState([]);
    const [currentTurnRole, setCurrentTurnRole] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [debateHistory, setDebateHistory] = useState([]);
    // Debate progress tracking
    const [currentRound, setCurrentRound] = useState(0);
    const [totalRounds] = useState(3);
    const [debatePhase, setDebatePhase] = useState('idle');
    const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');
    const textareaRef = useRef(null);
    const accumulatedContent = useRef({});
    const socketRef = useRef(null);
    // track role transitions to count rounds
    const turnRoleTracker = useRef([]);
    // ── Socket Connection ──────────────────────────────────────────────────────
    const connectSocket = useCallback(() => {
        if (!token)
            return;
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setIsConnecting(true);
        setIsConnected(false);
        setErrorMessage('');
        const s = io(GATEWAY_URL, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            timeout: 15000,
        });
        socketRef.current = s;
        s.on('connect', () => {
            setIsConnected(true);
            setIsConnecting(false);
            setErrorMessage('');
            setStatusMessage('Arena online — ready for battle');
        });
        s.on('disconnect', (reason) => {
            setIsConnected(false);
            setStatusMessage('');
            if (reason !== 'io client disconnect') {
                setErrorMessage('Connection lost. Reconnecting…');
            }
        });
        s.on('connect_error', (err) => {
            setIsConnected(false);
            setIsConnecting(false);
            const msg = (err.message || '').toLowerCase();
            if (msg.includes('auth') || msg.includes('token') || msg.includes('jwt')) {
                setErrorMessage('Authentication error — please logout and login again.');
            }
            else if (msg.includes('refused') || msg.includes('econnrefused')) {
                setErrorMessage('Gateway server is offline. Start it with: cd backend/gateway && node server.js');
            }
            else {
                setErrorMessage('Could not reach gateway (port 3001). Check that the gateway is running.');
            }
        });
        s.on('reconnect_attempt', (attempt) => {
            setStatusMessage(`Reconnecting… attempt ${attempt}`);
        });
        s.on('reconnect', () => {
            setIsConnected(true);
            setIsConnecting(false);
            setErrorMessage('');
            setStatusMessage('Reconnected to arena');
        });
        s.on('reconnect_failed', () => {
            setErrorMessage('Could not reconnect after 10 attempts. Click "Reconnect" to try again.');
        });
        s.on('connected', (data) => {
            setStatusMessage(`Welcome back, ${data.user.username}`);
        });
        s.on('session_created', ({ sessionId: sid }) => {
            setSessionId(sid);
        });
        s.on('debate_started', ({ query: q }) => {
            setIsDebating(true);
            setTurns([]);
            setCurrentRound(1);
            setDebatePhase('debating');
            turnRoleTracker.current = [];
            accumulatedContent.current = {};
            setStatusMessage('Debate in progress…');
        });
        s.on('agent_turn_start', ({ role }) => {
            setCurrentTurnRole(role);
            setTurns(prev => [...prev, { role: role, content: '', isStreaming: true }]);
            // Track round transitions
            if (role === 'researcher') {
                const prevRoles = turnRoleTracker.current;
                if (prevRoles.length > 0 && prevRoles[prevRoles.length - 1] === 'critic') {
                    setCurrentRound(r => r + 1);
                }
            }
            if (role === 'synthesizer') {
                setDebatePhase('synthesizing');
            }
            turnRoleTracker.current.push(role);
        });
        s.on('agent_chunk', ({ role, content }) => {
            accumulatedContent.current[role] = (accumulatedContent.current[role] || '') + content;
            setTurns(prev => {
                const updated = [...prev];
                const lastIdx = updated.map(t => t.role).lastIndexOf(role);
                if (lastIdx !== -1) {
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: accumulatedContent.current[role],
                        isStreaming: true,
                    };
                }
                else {
                    updated.push({
                        role: role,
                        content: accumulatedContent.current[role],
                        isStreaming: true,
                    });
                }
                return updated;
            });
        });
        s.on('debate_complete', ({ sessionId: sid }) => {
            setTurns(prev => prev.map(t => ({ ...t, isStreaming: false })));
            setIsDebating(false);
            setCurrentTurnRole(null);
            setDebatePhase('complete');
            setCurrentRound(totalRounds);
            setStatusMessage('Debate concluded — verdict delivered');
            setDebateHistory(prev => {
                const q = lastSubmittedQuery || textareaRef.current?.value || '';
                return [{ query: q, sessionId: sid }, ...prev.slice(0, 9)];
            });
            // Reset accumulated content for next debate
            accumulatedContent.current = {};
        });
        s.on('error', ({ message }) => {
            setErrorMessage(message);
            setIsDebating(false);
            setDebatePhase('idle');
            setTurns(prev => prev.map(t => ({ ...t, isStreaming: false })));
        });
        setSocket(s);
    }, [token]);
    useEffect(() => {
        connectSocket();
        return () => {
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [connectSocket]);
    const handleSubmit = useCallback((e) => {
        e?.preventDefault();
        const s = socketRef.current;
        if (!s || !isConnected || !query.trim() || isDebating)
            return;
        setErrorMessage('');
        setLastSubmittedQuery(query.trim());
        s.emit('submit_query', { query: query.trim(), conversationId: null });
        setQuery('');
        textareaRef.current?.blur();
    }, [isConnected, query, isDebating]);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSubmit();
        }
    };
    const handleExampleQuery = (q) => {
        setQuery(q);
        textareaRef.current?.focus();
    };
    const handleNewDebate = () => {
        setTurns([]);
        setCurrentRound(0);
        setDebatePhase('idle');
        setCurrentTurnRole(null);
        setLastSubmittedQuery('');
        setStatusMessage('Arena online — ready for battle');
    };
    // Round progress percentage
    const progressPct = debatePhase === 'synthesizing' || debatePhase === 'complete'
        ? 100
        : debatePhase === 'debating'
            ? Math.min(((currentRound - 1) / totalRounds) * 100 + 10, 90)
            : 0;
    const activeRoleLabel = currentTurnRole === 'researcher'
        ? '🔬 Researcher Speaking'
        : currentTurnRole === 'critic'
            ? '⚡ Critic Attacking'
            : currentTurnRole === 'synthesizer'
                ? '🧠 Synthesizer Judging'
                : '';
    return (<div className="arena-layout">
      <div className="cyber-grid"/>

      {/* ── Top Navigation Bar ── */}
      <header className="arena-navbar glass-card" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <div className="navbar-brand">
          <div className="nav-logo">⚡</div>
          <div>
            <span className="font-display nav-title">DEBATE ARENA</span>
            <span className="nav-subtitle">Multi-Agent AI Architecture Review</span>
          </div>
        </div>

        <div className="navbar-center">
          <div className={`connection-status ${isConnected ? 'status--online' : isConnecting ? 'status--connecting' : 'status--offline'}`}>
            <div className="status-dot"/>
            {isConnected ? 'Arena Online' : isConnecting ? 'Connecting…' : 'Disconnected'}
          </div>
          {!isConnected && !isConnecting && (<button className="btn-reconnect" onClick={connectSocket} id="reconnect-btn" title="Reconnect to gateway">
              ↻ Reconnect
            </button>)}
          {statusMessage && isConnected && (<span className="status-message">{statusMessage}</span>)}
        </div>

        <div className="navbar-actions">
          <span className="nav-user">
            <span>👤</span> {user?.username}
          </span>
          <button className="btn-ghost" onClick={toggleTheme} id="arena-theme-toggle" aria-label="Toggle theme">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="btn-ghost" onClick={logout} id="arena-logout" style={{ color: '#ff4757', borderColor: 'rgba(255,71,87,0.3)' }}>
            ⎋ Logout
          </button>
        </div>
      </header>

      {/* ── Debate Progress Bar ── */}
      {debatePhase !== 'idle' && (<div className="debate-progress-bar-wrapper">
          <div className="debate-progress-bar" style={{ width: `${progressPct}%` }}/>
          <div className="debate-progress-info">
            {debatePhase === 'debating' && (<>
                <span className="progress-rounds">Round {currentRound} of {totalRounds}</span>
                {activeRoleLabel && <span className={`active-role-label active-role--${currentTurnRole}`}>{activeRoleLabel}</span>}
              </>)}
            {debatePhase === 'synthesizing' && (<span className="active-role-label active-role--synthesizer">🧠 Synthesizer delivering final verdict…</span>)}
            {debatePhase === 'complete' && (<span className="active-role-label active-role--complete">✅ Debate complete — {totalRounds} rounds</span>)}
          </div>
        </div>)}

      {/* ── Main Workspace ── */}
      <main className="arena-workspace">
        {/* ── Left Pane: Agent Timeline ── */}
        <section className="arena-left-pane">
          <div className="pane-header">
            <h2 className="pane-title">
              <span>⚔️</span> Live Debate Feed
            </h2>
            <div className="pane-header-right">
              {isDebating && currentTurnRole && (<div className={`active-agent-badge badge badge-${currentTurnRole}`}>
                  {currentTurnRole === 'researcher' ? '🔬' : currentTurnRole === 'critic' ? '⚡' : '🧠'}
                  {' '}{currentTurnRole} speaking…
                </div>)}
              {!isDebating && turns.length > 0 && (<>
                  <div className="turns-count">{turns.length} turns</div>
                  <button className="btn-ghost btn-new-debate" onClick={handleNewDebate} id="new-debate-btn">
                    + New Debate
                  </button>
                </>)}
            </div>
          </div>

          {/* Submitted query display */}
          {lastSubmittedQuery && (<div className="submitted-query-bar">
              <span className="submitted-query-label">Query:</span>
              <span className="submitted-query-text">{lastSubmittedQuery}</span>
            </div>)}

          <div className="timeline-container">
            <AgentTimeline turns={turns} isDebating={isDebating}/>
          </div>
        </section>

        {/* ── Right Pane: Query & Control ── */}
        <section className="arena-right-pane">
          {/* Query Form */}
          <div className="query-panel glass-card">
            <div className="query-panel-header">
              <h3 className="query-title">
                <span style={{ color: 'var(--neon-cyan)' }}>▶</span> Submit Architectural Query
              </h3>
              <span className="query-hint">Ctrl+Enter to submit</span>
            </div>

            <form onSubmit={handleSubmit} id="debate-form">
              <textarea ref={textareaRef} id="debate-query-input" className="input-field query-textarea" placeholder={"Describe your architectural dilemma…\n\ne.g. Should I use GraphQL or REST for my mobile app?"} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} disabled={isDebating} rows={5} maxLength={1000}/>

              <div className="query-footer">
                <span className="char-count">{query.length}/1000</span>
                <button id="submit-debate-btn" type="submit" className="btn-primary" disabled={!isConnected || !query.trim() || isDebating}>
                  {isDebating ? (<><div className="spinner"/> Debating…</>) : (<><span>⚔️</span> Launch Debate</>)}
                </button>
              </div>
            </form>

            {errorMessage && (<div className="error-alert animate-fadeIn" role="alert" style={{ marginTop: 12 }}>
                <span>⚠</span>
                <span style={{ flex: 1 }}>{errorMessage}</span>
                {!isConnected && (<button className="btn-retry" onClick={connectSocket} id="retry-connect-btn">Retry</button>)}
              </div>)}
          </div>

          {/* Debate Config Info */}
          <div className="config-panel glass-card">
            <h3 className="examples-title">⚙️ Debate Configuration</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-key">Rounds</span>
                <span className="config-value">{totalRounds}</span>
              </div>
              <div className="config-item">
                <span className="config-key">Flow</span>
                <span className="config-value" style={{ fontSize: '0.75rem' }}>R ⇄ C × {totalRounds} → S</span>
              </div>
              <div className="config-item">
                <span className="config-key">Output</span>
                <span className="config-value" style={{ fontSize: '0.72rem' }}>Structured + Code</span>
              </div>
            </div>

            {/* Round progress dots */}
            <div className="round-dots">
              {Array.from({ length: totalRounds }).map((_, i) => (<div key={i} className={`round-dot ${debatePhase === 'complete' || (debatePhase === 'debating' && i < currentRound)
                ? 'round-dot--done'
                : debatePhase === 'debating' && i === currentRound - 1
                    ? 'round-dot--active'
                    : ''}`}>
                  <span>{i + 1}</span>
                </div>))}
              <div className={`round-dot round-dot--synth ${debatePhase === 'synthesizing' || debatePhase === 'complete' ? 'round-dot--done' : ''}`}>
                <span>⚖️</span>
              </div>
            </div>
          </div>

          {/* Example Queries */}
          <div className="examples-panel glass-card">
            <h3 className="examples-title">💡 Example Queries</h3>
            <div className="examples-list">
              {EXAMPLE_QUERIES.map((q, i) => (<button key={i} className="example-query-btn" onClick={() => handleExampleQuery(q)} disabled={isDebating} id={`example-query-${i}`}>
                  <span className="example-arrow">→</span>
                  <span>{q}</span>
                </button>))}
            </div>
          </div>

          {/* Session History */}
          {debateHistory.length > 0 && (<div className="history-panel glass-card">
              <h3 className="examples-title">📋 Recent Sessions</h3>
              <div className="history-list">
                {debateHistory.slice(0, 5).map((h, i) => (<div key={i} className="history-item">
                    <span className="history-icon">🗂</span>
                    <span className="history-query">{h.query.substring(0, 60)}…</span>
                  </div>))}
              </div>
            </div>)}

          {/* Agent Legend */}
          <div className="legend-panel glass-card">
            <h3 className="examples-title">🎭 Agent Roster</h3>
            <div className="legend-list">
              {AGENT_ROSTER.map(a => (<div key={a.role} className={`legend-item legend-item--${a.role}`}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{a.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: `var(--${a.role}-color)` }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{a.fullName}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace', opacity: 0.7 }}>
                      {a.systemPrompt}
                    </div>
                  </div>
                  <div className="model-tag font-mono" style={{ flexShrink: 0 }}>{a.model}</div>
                </div>))}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .arena-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--bg-void);
          position: relative;
          overflow: hidden;
        }

        .arena-navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 62px;
          flex-shrink: 0;
          z-index: 10;
          position: relative;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-logo {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, var(--neon-cyan), #0066ff);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          box-shadow: 0 0 16px rgba(0, 245, 255, 0.3);
        }

        .nav-title {
          display: block;
          font-size: 0.95rem;
          letter-spacing: 0.18em;
          color: var(--neon-cyan);
        }

        .nav-subtitle {
          display: block;
          font-size: 0.65rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .navbar-center {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid;
        }

        .status--online { color: #00ff87; border-color: rgba(0,255,135,0.3); background: rgba(0,255,135,0.06); }
        .status--offline { color: #ff4757; border-color: rgba(255,71,87,0.3); background: rgba(255,71,87,0.06); }
        .status--connecting { color: #ffa502; border-color: rgba(255,165,2,0.3); background: rgba(255,165,2,0.06); }

        .status-dot { width: 7px; height: 7px; border-radius: 50%; }
        .status--online .status-dot { background: #00ff87; box-shadow: 0 0 8px #00ff87; animation: glowPulse 2s ease-in-out infinite; }
        .status--offline .status-dot { background: #ff4757; }
        .status--connecting .status-dot { background: #ffa502; animation: glowPulse 1s ease-in-out infinite; }

        .status-message {
          font-size: 0.8rem;
          color: var(--text-muted);
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-reconnect {
          display: flex; align-items: center; gap: 4px;
          padding: 5px 12px;
          background: rgba(255,165,2,0.1);
          color: #ffa502;
          border: 1px solid rgba(255,165,2,0.3);
          border-radius: 20px;
          font-size: 0.8rem; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Space Grotesk', sans-serif;
        }
        .btn-reconnect:hover { background: rgba(255,165,2,0.2); transform: scale(1.03); }

        .btn-retry {
          padding: 3px 10px;
          background: rgba(255,71,87,0.15);
          color: #ff4757;
          border: 1px solid rgba(255,71,87,0.4);
          border-radius: 6px;
          font-size: 0.78rem; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          font-family: 'Space Grotesk', sans-serif;
          transition: all 0.2s ease; flex-shrink: 0;
        }
        .btn-retry:hover { background: rgba(255,71,87,0.25); }

        .navbar-actions {
          display: flex; align-items: center; gap: 10px;
        }

        .nav-user {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.85rem; color: var(--text-secondary);
          padding: 5px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
        }

        /* ── Debate Progress Bar ── */
        .debate-progress-bar-wrapper {
          flex-shrink: 0;
          position: relative;
          height: 3px;
          background: var(--bg-surface);
          z-index: 9;
        }

        .debate-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), var(--synthesizer-color));
          transition: width 0.8s ease;
          box-shadow: 0 0 8px rgba(0, 245, 255, 0.4);
        }

        .debate-progress-info {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-panel);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 3px 14px;
          white-space: nowrap;
        }

        .progress-rounds {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }

        .active-role-label {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.03em;
        }
        .active-role--researcher { color: var(--researcher-color); }
        .active-role--critic { color: var(--critic-color); }
        .active-role--synthesizer { color: var(--synthesizer-color); }
        .active-role--complete { color: #00ff87; }

        /* ── Main Workspace ── */
        .arena-workspace {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .arena-left-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-panel);
          overflow: hidden;
        }

        .pane-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-panel);
          flex-shrink: 0;
        }

        .pane-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.92rem; font-weight: 700;
          color: var(--text-primary);
        }

        .pane-header-right {
          display: flex; align-items: center; gap: 10px;
        }

        .active-agent-badge {
          font-size: 0.8rem;
          animation: glowPulse 1.5s ease-in-out infinite;
        }

        .turns-count {
          font-size: 0.78rem;
          color: var(--text-muted);
          padding: 3px 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
        }

        .btn-new-debate {
          font-size: 0.78rem;
          padding: 5px 12px;
          border-radius: 8px;
          color: var(--neon-cyan) !important;
          border-color: var(--researcher-border) !important;
        }

        /* ── Submitted Query Bar ── */
        .submitted-query-bar {
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(0, 245, 255, 0.03);
          border-bottom: 1px solid var(--border-subtle);
        }

        .submitted-query-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--neon-cyan);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          flex-shrink: 0;
          padding-top: 2px;
        }

        .submitted-query-text {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .timeline-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* ── Right Pane ── */
        .arena-right-pane {
          width: 390px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 16px;
          overflow-y: auto;
          background: var(--bg-panel);
        }

        .query-panel { padding: 18px; }

        .query-panel-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }

        .query-title {
          font-size: 0.88rem; font-weight: 600; color: var(--text-primary);
          display: flex; align-items: center; gap: 8px;
        }

        .query-hint {
          font-size: 0.7rem; color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }

        .query-textarea {
          resize: none;
          font-size: 0.87rem;
          line-height: 1.6;
          min-height: 115px;
        }

        .query-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 11px;
        }

        .char-count {
          font-size: 0.72rem; color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }

        .error-alert {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px;
          background: rgba(255,71,87,0.1);
          border: 1px solid rgba(255,71,87,0.3);
          border-radius: 8px;
          color: #ff4757; font-size: 0.82rem; line-height: 1.4;
        }

        /* ── Config Panel ── */
        .config-panel { padding: 16px; }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }

        .config-item {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 8px 6px;
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
        }

        .config-key {
          font-size: 0.65rem; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
          font-weight: 600;
        }

        .config-value {
          font-size: 0.88rem; font-weight: 700;
          color: var(--neon-cyan);
          font-family: 'JetBrains Mono', monospace;
        }

        /* Round progress dots */
        .round-dots {
          display: flex; align-items: center; gap: 8px;
          justify-content: center;
        }

        .round-dot {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700;
          background: var(--bg-input);
          border: 2px solid var(--border-subtle);
          color: var(--text-muted);
          transition: all 0.4s ease;
        }

        .round-dot--active {
          border-color: var(--neon-cyan);
          color: var(--neon-cyan);
          box-shadow: 0 0 12px rgba(0, 245, 255, 0.3);
          animation: glowPulse 1.5s ease-in-out infinite;
        }

        .round-dot--done {
          border-color: #00ff87;
          background: rgba(0, 255, 135, 0.1);
          color: #00ff87;
        }

        .round-dot--synth {
          font-size: 0.9rem;
          border-color: var(--synthesizer-border);
          color: var(--synthesizer-color);
        }

        .round-dot--synth.round-dot--done {
          background: var(--synthesizer-bg);
          border-color: var(--synthesizer-color);
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.3);
        }

        /* ── Examples ── */
        .examples-panel, .history-panel, .legend-panel, .config-panel { padding: 16px; }

        .examples-title {
          font-size: 0.82rem; font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }

        .examples-list { display: flex; flex-direction: column; gap: 5px; }

        .example-query-btn {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 9px 11px;
          background: transparent;
          color: var(--text-secondary);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.78rem;
          text-align: left;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          line-height: 1.5;
        }

        .example-query-btn:hover:not(:disabled) {
          color: var(--neon-cyan);
          border-color: var(--researcher-border);
          background: var(--researcher-bg);
        }

        .example-query-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .example-arrow { color: var(--neon-cyan); flex-shrink: 0; margin-top: 1px; }

        /* ── History ── */
        .history-list { display: flex; flex-direction: column; gap: 5px; }

        .history-item {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px;
          border-radius: 8px;
          background: var(--bg-input);
          font-size: 0.76rem; color: var(--text-secondary);
        }

        .history-icon { flex-shrink: 0; }
        .history-query { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ── Legend ── */
        .legend-list { display: flex; flex-direction: column; gap: 8px; }

        .legend-item {
          display: flex; align-items: flex-start;
          gap: 10px; padding: 11px 12px;
          border-radius: 10px; border: 1px solid;
        }

        .legend-item--researcher { background: var(--researcher-bg); border-color: var(--researcher-border); }
        .legend-item--critic { background: var(--critic-bg); border-color: var(--critic-border); }
        .legend-item--synthesizer { background: var(--synthesizer-bg); border-color: var(--synthesizer-border); }

        .model-tag {
          font-size: 0.62rem; color: var(--text-muted);
          white-space: nowrap;
          padding: 2px 6px;
          background: var(--bg-input);
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
          margin-top: 1px;
        }
      `}</style>
    </div>);
};
export default DebateArena;
