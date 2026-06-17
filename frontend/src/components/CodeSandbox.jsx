// src/components/CodeSandbox.tsx
import React, { useState } from 'react';
const extractAllCodeBlocks = (text) => {
    const blocks = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
        blocks.push({
            language: match[1] || 'code',
            code: match[2].trim(),
            index: idx++,
        });
    }
    return blocks;
};
const formatCodeWithLineNumbers = (code) => {
    return code.split('\n').map((line, i) => ({ num: i + 1, line }));
};
const CodeSandbox = ({ content, label }) => {
    const [copied, setCopied] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const codeBlocks = extractAllCodeBlocks(content);
    if (codeBlocks.length === 0)
        return null;
    const activeBlock = codeBlocks[activeTab] ?? codeBlocks[0];
    const handleCopy = async (code, idx) => {
        try {
            await navigator.clipboard.writeText(code);
        }
        catch {
            const el = document.createElement('textarea');
            el.value = code;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(idx);
        setTimeout(() => setCopied(null), 2500);
    };
    const lines = formatCodeWithLineNumbers(activeBlock.code);
    return (<div className="code-sandbox">
      {/* Top accent line */}
      <div className="code-sandbox-accent"/>

      {/* Header bar */}
      <div className="code-sandbox-header">
        <div className="code-sandbox-dots">
          <span className="dot dot-red"/>
          <span className="dot dot-yellow"/>
          <span className="dot dot-green"/>
        </div>

        {/* Tab selector for multiple code blocks */}
        {codeBlocks.length > 1 ? (<div className="code-tabs">
            {codeBlocks.map((b, i) => (<button key={i} className={`code-tab ${i === activeTab ? 'code-tab--active' : ''}`} onClick={() => setActiveTab(i)}>
                <span className="code-lang-badge">{b.language.toUpperCase()}</span>
              </button>))}
          </div>) : (<div className="code-sandbox-label">
            <span className="code-lang-badge">{activeBlock.language.toUpperCase()}</span>
            <span className="code-label-text">
              {label ?? 'Production-Ready Boilerplate'}
            </span>
          </div>)}

        <div className="code-sandbox-actions">
          <button className="code-action-btn" onClick={() => setShowLineNumbers(v => !v)} title="Toggle line numbers">
            {showLineNumbers ? '# Lines' : '# Off'}
          </button>
          <button id={`copy-code-btn-${activeBlock.index}`} className={`copy-btn ${copied === activeBlock.index ? 'copy-btn--copied' : ''}`} onClick={() => handleCopy(activeBlock.code, activeBlock.index)} aria-label="Copy code to clipboard" title="Copy code">
            {copied === activeBlock.index ? (<><span>✓</span> Copied!</>) : (<><span>⧉</span> Copy</>)}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="code-sandbox-body">
        <table className="code-table">
          <tbody>
            {lines.map(({ num, line }) => (<tr key={num} className="code-line">
                {showLineNumbers && (<td className="code-line-num">{num}</td>)}
                <td className="code-line-content">
                  <span>{line || '\u00a0'}</span>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="code-sandbox-footer">
        <div className="code-sandbox-footer-glow"/>
        <span className="code-sandbox-footer-text">
          🧠 Synthesizer AI — Production-Ready Output · {lines.length} lines
        </span>
        <span className="code-sandbox-footer-lang">
          {activeBlock.language}
        </span>
      </div>

      <style>{`
        .code-sandbox {
          margin-top: 20px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--synthesizer-border);
          box-shadow: var(--synthesizer-glow), 0 8px 32px rgba(0,0,0,0.4);
          position: relative;
          background: #060a12;
        }

        .code-sandbox-accent {
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--synthesizer-color), var(--neon-cyan), transparent);
        }

        .code-sandbox-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(10, 10, 20, 0.98);
          border-bottom: 1px solid rgba(167, 139, 250, 0.15);
        }

        .code-sandbox-dots {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .dot-red { background: #ff5f57; }
        .dot-yellow { background: #febc2e; }
        .dot-green { background: #28c840; }

        .code-tabs {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .code-tab {
          background: transparent;
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 3px 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Space Grotesk', sans-serif;
        }

        .code-tab--active {
          border-color: var(--synthesizer-border);
          background: var(--synthesizer-bg);
        }

        .code-sandbox-label {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .code-lang-badge {
          padding: 2px 8px;
          background: var(--synthesizer-bg);
          border: 1px solid var(--synthesizer-border);
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--synthesizer-color);
          letter-spacing: 0.1em;
        }

        .code-label-text {
          font-size: 0.8rem;
          color: #64748b;
          font-family: 'Space Grotesk', sans-serif;
        }

        .code-sandbox-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .code-action-btn {
          padding: 4px 10px;
          background: transparent;
          color: #475569;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          border: 1px solid var(--border-subtle);
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .code-action-btn:hover {
          color: var(--text-secondary);
          border-color: var(--border-glass);
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          background: transparent;
          color: var(--synthesizer-color);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          border: 1px solid var(--synthesizer-border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
        }

        .copy-btn:hover {
          background: var(--synthesizer-bg);
          box-shadow: var(--synthesizer-glow);
        }

        .copy-btn--copied {
          border-color: #00ff87;
          color: #00ff87;
          background: rgba(0, 255, 135, 0.08);
        }

        .code-sandbox-body {
          background: #060a12;
          overflow-x: auto;
          max-height: 540px;
          overflow-y: auto;
        }

        .code-table {
          border-collapse: collapse;
          width: 100%;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.82rem;
          line-height: 1.7;
        }

        .code-line {
          transition: background 0.1s ease;
        }

        .code-line:hover {
          background: rgba(255,255,255,0.03);
        }

        .code-line-num {
          padding: 0 16px 0 20px;
          color: #334155;
          text-align: right;
          user-select: none;
          white-space: nowrap;
          width: 1%;
          vertical-align: top;
          padding-top: 0;
        }

        .code-line-content {
          padding: 0 24px 0 8px;
          color: #e2e8f0;
          white-space: pre;
          vertical-align: top;
        }

        .code-sandbox-footer {
          padding: 8px 16px;
          background: rgba(10, 10, 20, 0.98);
          border-top: 1px solid rgba(167, 139, 250, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .code-sandbox-footer-glow {
          width: 6px;
          height: 6px;
          background: var(--synthesizer-color);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--synthesizer-color);
          animation: glowPulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        .code-sandbox-footer-text {
          flex: 1;
          font-size: 0.72rem;
          color: #475569;
          font-family: 'JetBrains Mono', monospace;
        }

        .code-sandbox-footer-lang {
          font-size: 0.7rem;
          color: #334155;
          font-family: 'JetBrains Mono', monospace;
          padding: 1px 6px;
          border: 1px solid #1e293b;
          border-radius: 3px;
        }
      `}</style>
    </div>);
};
export default CodeSandbox;
