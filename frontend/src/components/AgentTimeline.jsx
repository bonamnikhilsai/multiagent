// src/components/AgentTimeline.tsx
import React, { useEffect, useRef } from 'react';
import CodeSandbox from './CodeSandbox';
// ─── Agent Config ──────────────────────────────────────────────────────────────
const AGENT_CONFIG = {
    researcher: {
        icon: '🔬',
        label: 'The Researcher',
        tagline: 'Senior Solution Architect',
        colorClass: 'researcher',
        model: 'MODEL_1',
    },
    critic: {
        icon: '⚡',
        label: 'The Critic',
        tagline: 'Principal Systems Reviewer',
        colorClass: 'critic',
        model: 'MODEL_2',
    },
    synthesizer: {
        icon: '🧠',
        label: 'The Synthesizer',
        tagline: 'Principal AI Architect & Judge',
        colorClass: 'synthesizer',
        model: 'MODEL_3',
    },
    system: { icon: '🔧', label: 'System', tagline: '', colorClass: 'researcher', model: '' },
    error: { icon: '⚠️', label: 'Error', tagline: '', colorClass: 'critic', model: '' },
};
const extractSection = (text, header, nextHeaders) => {
    // Try both multi-line headers ("Header:\n...") and inline ("Header: value")
    const startPattern = new RegExp(`${header}\\s*:?\\s*\\n`, 'i');
    const startMatch = text.match(startPattern);
    if (!startMatch || startMatch.index === undefined)
        return '';
    const start = startMatch.index + startMatch[0].length;
    let end = text.length;
    for (const nextHeader of nextHeaders) {
        const nextPattern = new RegExp(`${nextHeader}\\s*:?\\s*\\n`, 'i');
        const nextMatch = text.slice(start).match(nextPattern);
        if (nextMatch && nextMatch.index !== undefined) {
            end = Math.min(end, start + nextMatch.index);
        }
    }
    return text.slice(start, end).trim();
};
const extractInlineField = (text, fieldName) => {
    // Extract "FieldName: value" from a single line (for Topic, Winner, Recommendation, etc.)
    const pattern = new RegExp(`${fieldName}\\s*:\\s*(.+?)(?:\\n|$)`, 'i');
    const match = text.match(pattern);
    return match?.[1]?.trim() ?? '';
};
const extractBullets = (text) => {
    return text
        .split('\n')
        .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
        .filter(l => l.length > 0 && !l.match(/^[A-Z\s]{3,}:$/));
};
const parseResearcher = (content) => {
    const headers = [
        'Topic',
        'Current Position',
        'Key Advantages',
        'Defense',
        'Pain Points Addressed',
        'Recommendation',
        'Confidence',
    ];
    const getSection = (h) => extractSection(content, h, headers.filter(x => x !== h));
    return {
        topic: extractInlineField(content, 'Topic'),
        currentPosition: extractInlineField(content, 'Current Position') || getSection('Current Position'),
        keyAdvantages: extractBullets(getSection('Key Advantages')),
        defense: getSection('Defense'),
        painPointsAddressed: extractBullets(getSection('Pain Points Addressed')),
        recommendation: extractInlineField(content, 'Recommendation') || getSection('Recommendation'),
        confidence: (extractInlineField(content, 'Confidence') || getSection('Confidence')).match(/\d+/)?.[0] ?? '',
        raw: content,
    };
};
const parseCritic = (content) => {
    const headers = [
        'Topic',
        'Targeted Claim',
        'Counter Arguments',
        'Risks & Failure Scenarios',
        'Risks \\& Failure Scenarios',
        'Alternative',
        'Pain Points Exposed',
        'Risk Severity',
    ];
    const getSection = (h) => extractSection(content, h, headers.filter(x => x !== h));
    const rawSeverity = extractInlineField(content, 'Risk Severity') || getSection('Risk Severity');
    const severityMatch = rawSeverity.match(/\b(CRITICAL|HIGH|MEDIUM|LOW)\b/i);
    const severity = (severityMatch?.[1]?.toUpperCase() ?? '');
    // Try both "Risks & Failure Scenarios" and "Risks \& Failure Scenarios" (escaped ampersand)
    const risksRaw = getSection('Risks & Failure Scenarios') || getSection('Risks \\& Failure Scenarios');
    return {
        topic: extractInlineField(content, 'Topic'),
        targetedClaim: extractInlineField(content, 'Targeted Claim') || getSection('Targeted Claim'),
        counterArguments: extractBullets(getSection('Counter Arguments')),
        risksAndFailures: extractBullets(risksRaw),
        alternative: extractInlineField(content, 'Alternative') || getSection('Alternative'),
        painPointsExposed: extractBullets(getSection('Pain Points Exposed')),
        riskSeverity: severity,
        raw: content,
    };
};
const parseSynthesizer = (content) => {
    const headers = [
        'Topic',
        'Winner',
        'Final Verdict',
        'Winning Reasons',
        'Strongest Debate Points',
        'Key Pain Points & Risk Mitigation',
        'Key Pain Points \\& Risk Mitigation',
        'Production Architecture',
        'JavaScript Boilerplate',
        'Implementation Roadmap',
        'Confidence',
    ];
    const getSection = (h) => extractSection(content, h, headers.filter(x => x !== h));
    // Try both escaped and unescaped ampersand
    const painMitigationRaw = getSection('Key Pain Points & Risk Mitigation') || getSection('Key Pain Points \\& Risk Mitigation');
    return {
        topic: extractInlineField(content, 'Topic'),
        winner: extractInlineField(content, 'Winner'),
        finalVerdict: extractInlineField(content, 'Final Verdict') || getSection('Final Verdict'),
        winningReasons: extractBullets(getSection('Winning Reasons')),
        strongestDebatePoints: extractBullets(getSection('Strongest Debate Points')),
        painPointsAndMitigation: extractBullets(painMitigationRaw),
        productionArchitecture: extractBullets(getSection('Production Architecture')),
        implementationRoadmap: extractBullets(getSection('Implementation Roadmap')),
        confidence: (extractInlineField(content, 'Confidence') || getSection('Confidence')).match(/\d+/)?.[0] ?? '',
        raw: content,
    };
};
// ─── Sub-components ────────────────────────────────────────────────────────────
const ConfidenceMeter = ({ score, colorClass }) => {
    const num = parseInt(score, 10);
    if (isNaN(num))
        return null;
    return (<div className="confidence-meter">
      <span className="confidence-label">Confidence</span>
      <div className="confidence-bar-track">
        <div className={`confidence-bar-fill confidence-bar-fill--${colorClass}`} style={{ width: `${Math.min(num, 100)}%` }}/>
      </div>
      <span className={`confidence-score confidence-score--${colorClass}`}>{num}/100</span>
    </div>);
};
const RiskBadge = ({ severity }) => {
    if (!severity)
        return null;
    const colors = {
        CRITICAL: 'risk-critical',
        HIGH: 'risk-high',
        MEDIUM: 'risk-medium',
        LOW: 'risk-low',
    };
    const icons = {
        CRITICAL: '🔴',
        HIGH: '🟠',
        MEDIUM: '🟡',
        LOW: '🟢',
    };
    return (<div className={`risk-badge ${colors[severity] ?? ''}`}>
      <span>{icons[severity]}</span>
      <span>Risk: {severity}</span>
    </div>);
};
const SectionHeader = ({ icon, title, colorClass }) => (<div className={`section-header section-header--${colorClass}`}>
    <span className="section-header-icon">{icon}</span>
    <span className="section-header-title">{title}</span>
  </div>);
const BulletList = ({ items, colorClass, variant = 'default', }) => {
    if (!items.length)
        return null;
    return (<ul className={`structured-bullets structured-bullets--${variant}`}>
      {items.map((item, i) => (<li key={i} className={`structured-bullet structured-bullet--${colorClass}`}>
          <span className="bullet-dot"/>
          <span>{item}</span>
        </li>))}
    </ul>);
};
const PainPointChips = ({ items, colorClass }) => {
    if (!items.length)
        return null;
    return (<div className="pain-chips">
      {items.map((item, i) => (<span key={i} className={`pain-chip pain-chip--${colorClass}`}>
          {item.length > 60 ? item.slice(0, 57) + '…' : item}
        </span>))}
    </div>);
};
// ─── Structured Card Renderers ─────────────────────────────────────────────────
const ResearcherCard = ({ parsed, isStreaming }) => {
    const isStructured = parsed.keyAdvantages.length > 0 || parsed.currentPosition.length > 0;
    if (!isStructured || isStreaming) {
        return (<div className={`agent-text ${isStreaming ? 'agent-text--streaming' : ''}`}>
        {parsed.raw.replace(/```[\s\S]*?```/g, '').trim()}
        {isStreaming && <span className="cursor-blink">▌</span>}
      </div>);
    }
    return (<div className="structured-output">
      {parsed.topic && (<div className="topic-label topic-label--researcher">
          <span>📋</span> Topic: {parsed.topic}
        </div>)}

      {parsed.currentPosition && (<div className="structured-section">
          <SectionHeader icon="🎯" title="Current Position" colorClass="researcher"/>
          <p className="section-prose">{parsed.currentPosition}</p>
        </div>)}

      {parsed.keyAdvantages.length > 0 && (<div className="structured-section">
          <SectionHeader icon="✅" title="Key Advantages" colorClass="researcher"/>
          <BulletList items={parsed.keyAdvantages} colorClass="researcher"/>
        </div>)}

      {parsed.defense && !parsed.defense.toLowerCase().includes('n/a') && (<div className="structured-section">
          <SectionHeader icon="🛡️" title="Defense" colorClass="researcher"/>
          <p className="section-prose">{parsed.defense}</p>
        </div>)}

      {parsed.painPointsAddressed.length > 0 && (<div className="structured-section">
          <SectionHeader icon="💡" title="Pain Points Addressed" colorClass="researcher"/>
          <PainPointChips items={parsed.painPointsAddressed} colorClass="researcher"/>
        </div>)}

      {parsed.recommendation && (<div className="structured-section">
          <SectionHeader icon="🏗️" title="Recommendation" colorClass="researcher"/>
          <div className="recommendation-callout recommendation-callout--researcher">
            <span>▶</span>
            <p>{parsed.recommendation}</p>
          </div>
        </div>)}

      {parsed.confidence && (<div className="structured-section">
          <ConfidenceMeter score={parsed.confidence} colorClass="researcher"/>
        </div>)}
    </div>);
};
const CriticCard = ({ parsed, isStreaming }) => {
    const isStructured = parsed.counterArguments.length > 0 || parsed.targetedClaim.length > 0;
    if (!isStructured || isStreaming) {
        return (<div className={`agent-text ${isStreaming ? 'agent-text--streaming' : ''}`}>
        {parsed.raw}
        {isStreaming && <span className="cursor-blink">▌</span>}
      </div>);
    }
    return (<div className="structured-output">
      {parsed.topic && (<div className="topic-label topic-label--critic">
          <span>📋</span> Topic: {parsed.topic}
        </div>)}

      {parsed.targetedClaim && (<div className="structured-section">
          <SectionHeader icon="🎯" title="Targeted Claim" colorClass="critic"/>
          <div className="targeted-claim-quote">
            <span className="quote-mark">"</span>
            <p>{parsed.targetedClaim}</p>
          </div>
        </div>)}

      {parsed.counterArguments.length > 0 && (<div className="structured-section">
          <SectionHeader icon="⚔️" title="Counter Arguments" colorClass="critic"/>
          <BulletList items={parsed.counterArguments} colorClass="critic"/>
        </div>)}

      {parsed.risksAndFailures.length > 0 && (<div className="structured-section">
          <SectionHeader icon="⚠️" title="Risks & Failure Scenarios" colorClass="critic"/>
          <BulletList items={parsed.risksAndFailures} colorClass="critic" variant="risk"/>
        </div>)}

      {parsed.alternative && (<div className="structured-section">
          <SectionHeader icon="🔄" title="Alternative" colorClass="critic"/>
          <p className="section-prose">{parsed.alternative}</p>
        </div>)}

      {parsed.painPointsExposed.length > 0 && (<div className="structured-section">
          <SectionHeader icon="🔍" title="Pain Points Exposed" colorClass="critic"/>
          <PainPointChips items={parsed.painPointsExposed} colorClass="critic"/>
        </div>)}

      {parsed.riskSeverity && (<div className="structured-section">
          <RiskBadge severity={parsed.riskSeverity}/>
        </div>)}
    </div>);
};
const SynthesizerCard = ({ parsed, isStreaming }) => {
    const isStructured = parsed.finalVerdict.length > 0 || parsed.winner.length > 0;
    if (!isStructured || isStreaming) {
        return (<div className={`agent-text ${isStreaming ? 'agent-text--streaming' : ''}`}>
        {parsed.raw.replace(/```[\s\S]*?```/g, '').trim()}
        {isStreaming && <span className="cursor-blink">▌</span>}
      </div>);
    }
    return (<div className="structured-output">
      {parsed.topic && (<div className="topic-label topic-label--synthesizer">
          <span>📋</span> Topic: {parsed.topic}
        </div>)}

      {/* Winner Badge */}
      {parsed.winner && (<div className="structured-section">
          <div className={`winner-badge winner-badge--${parsed.winner.toLowerCase()}`}>
            <span className="winner-trophy">🏆</span>
            <span className="winner-label">Winner:</span>
            <span className="winner-name">{parsed.winner}</span>
          </div>
        </div>)}

      {parsed.finalVerdict && (<div className="structured-section verdict-section">
          <SectionHeader icon="⚖️" title="Final Verdict" colorClass="synthesizer"/>
          <div className="verdict-box">
            <p className="verdict-text">{parsed.finalVerdict}</p>
          </div>
        </div>)}

      {parsed.winningReasons.length > 0 && (<div className="structured-section">
          <SectionHeader icon="✅" title="Winning Reasons" colorClass="synthesizer"/>
          <BulletList items={parsed.winningReasons} colorClass="synthesizer"/>
        </div>)}

      {parsed.strongestDebatePoints.length > 0 && (<div className="structured-section">
          <SectionHeader icon="🧩" title="Strongest Debate Points" colorClass="synthesizer"/>
          <BulletList items={parsed.strongestDebatePoints} colorClass="synthesizer"/>
        </div>)}

      {parsed.painPointsAndMitigation.length > 0 && (<div className="structured-section">
          <SectionHeader icon="🛡️" title="Key Pain Points & Risk Mitigation" colorClass="synthesizer"/>
          <BulletList items={parsed.painPointsAndMitigation} colorClass="synthesizer"/>
        </div>)}

      {parsed.productionArchitecture.length > 0 && (<div className="structured-section">
          <SectionHeader icon="🏗️" title="Production Architecture" colorClass="synthesizer"/>
          <BulletList items={parsed.productionArchitecture} colorClass="synthesizer"/>
        </div>)}

      {/* JavaScript Boilerplate Code block */}
      {parsed.raw.includes('```') && !isStreaming && (<CodeSandbox content={parsed.raw} label="JavaScript Boilerplate"/>)}

      {parsed.implementationRoadmap.length > 0 && (<div className="structured-section">
          <SectionHeader icon="🗺️" title="Implementation Roadmap" colorClass="synthesizer"/>
          <BulletList items={parsed.implementationRoadmap} colorClass="synthesizer"/>
        </div>)}

      {parsed.confidence && (<div className="structured-section">
          <ConfidenceMeter score={parsed.confidence} colorClass="synthesizer"/>
        </div>)}
    </div>);
};
// ─── Agent Turn Card ──────────────────────────────────────────────────────────
const AgentTurnCard = ({ turn, index }) => {
    const config = AGENT_CONFIG[turn.role] ?? AGENT_CONFIG.system;
    const renderContent = () => {
        if (turn.role === 'researcher') {
            const parsed = parseResearcher(turn.content);
            return <ResearcherCard parsed={parsed} isStreaming={turn.isStreaming}/>;
        }
        if (turn.role === 'critic') {
            const parsed = parseCritic(turn.content);
            return <CriticCard parsed={parsed} isStreaming={turn.isStreaming}/>;
        }
        if (turn.role === 'synthesizer') {
            const parsed = parseSynthesizer(turn.content);
            return <SynthesizerCard parsed={parsed} isStreaming={turn.isStreaming}/>;
        }
        return (<div className="agent-text">
        {turn.content}
        {turn.isStreaming && <span className="cursor-blink">▌</span>}
      </div>);
    };
    return (<div className={`agent-turn agent-turn--${config.colorClass} animate-slideInLeft`} style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}>
      {/* Agent header */}
      <div className="agent-turn-header">
        <div className={`agent-avatar agent-avatar--${config.colorClass}`}>
          <span>{config.icon}</span>
        </div>
        <div className="agent-identity">
          <div className="agent-name-row">
            <span className={`agent-name agent-name--${config.colorClass}`}>{config.label}</span>
            {turn.isStreaming && (<div className="streaming-indicator">
                <span /><span /><span />
              </div>)}
          </div>
          {config.tagline && <span className="agent-tagline">{config.tagline}</span>}
        </div>
        <div className="agent-header-right">
          <div className={`badge badge-${config.colorClass}`}>{turn.role.toUpperCase()}</div>
          {config.model && <div className="model-tag font-mono">{config.model}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="agent-turn-body">{renderContent()}</div>
    </div>);
};
// ─── Main AgentTimeline ────────────────────────────────────────────────────────
const AgentTimeline = ({ turns, isDebating }) => {
    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [turns]);
    if (turns.length === 0 && !isDebating) {
        return (<div className="timeline-empty">
        <div className="empty-icon">⚔️</div>
        <h3 className="empty-title">The Arena Awaits</h3>
        <p className="empty-subtitle">
          Submit an architectural query to trigger the debate.
          Three AI minds will battle it out in real-time across 3 rounds.
        </p>
        <div className="empty-agents">
          {['researcher', 'critic', 'synthesizer'].map(role => {
                const c = AGENT_CONFIG[role];
                return (<div key={role} className={`empty-agent-card empty-agent-card--${role}`}>
                <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: `var(--${role}-color)` }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.tagline}</div>
                </div>
                <div className="model-tag font-mono">{c.model}</div>
              </div>);
            })}
        </div>
        <div className="empty-flow-diagram">
          <div className="flow-node flow-node--researcher">🔬 R</div>
          <div className="flow-arrow">⇄</div>
          <div className="flow-node flow-node--critic">⚡ C</div>
          <div className="flow-arrow">→</div>
          <div className="flow-node flow-node--synthesizer">🧠 S</div>
        </div>
        <p className="flow-caption">3 rounds of adversarial debate → final engineering verdict</p>
      </div>);
    }
    const renderTurns = () => {
        const elements = [];
        let roundBuffer = [];
        let roundNum = 1;
        for (let i = 0; i < turns.length; i++) {
            const t = turns[i];
            if (t.role === 'researcher' || t.role === 'critic') {
                roundBuffer.push(t);
                const nextT = turns[i + 1];
                const isLastInRound = !nextT ||
                    nextT.role === 'researcher' ||
                    nextT.role === 'synthesizer' ||
                    nextT.role === 'system' ||
                    nextT.role === 'error';
                if (isLastInRound) {
                    elements.push(<div key={`round-${roundNum}`} className="debate-round-box animate-fadeIn">
              <div className="round-header">
                <div className="round-badge-pill">Round {roundNum}</div>
                <div className="round-line"/>
              </div>
              {roundBuffer.map((rt, idx) => (<AgentTurnCard key={`${rt.role}-${i}-${idx}`} turn={rt} index={idx}/>))}
            </div>);
                    roundBuffer = [];
                    roundNum++;
                }
            }
            else {
                // Synthesizer or error goes outside round boxes
                if (t.role === 'synthesizer') {
                    elements.push(<div key={`synth-${i}`} className="synthesizer-verdict-wrapper animate-fadeIn">
              <div className="verdict-divider">
                <div className="verdict-divider-line"/>
                <span className="verdict-divider-label">⚖️ Final Synthesis</span>
                <div className="verdict-divider-line"/>
              </div>
              <AgentTurnCard turn={t} index={0}/>
            </div>);
                }
                else {
                    elements.push(<AgentTurnCard key={`other-${i}`} turn={t} index={0}/>);
                }
            }
        }
        return elements;
    };
    return (<div className="agent-timeline">
      {renderTurns()}

      {isDebating && turns.length === 0 && (<div className="timeline-loading">
          <div className="spinner" style={{ width: 32, height: 32 }}/>
          <p>Initializing debate sequence…</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Agents are loading their context</p>
        </div>)}

      <div ref={bottomRef}/>

      <style>{`
        /* ── Timeline Container ── */
        .agent-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          height: 100%;
          overflow-y: auto;
        }

        /* ── Round Box ── */
        .debate-round-box {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 8px;
        }

        .round-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }

        .round-badge-pill {
          flex-shrink: 0;
          background: var(--bg-panel);
          color: var(--text-muted);
          padding: 3px 14px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          white-space: nowrap;
        }

        .round-line {
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }

        /* ── Synthesizer Verdict Wrapper ── */
        .synthesizer-verdict-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .verdict-divider {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .verdict-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--synthesizer-border));
        }

        .verdict-divider-line:last-child {
          background: linear-gradient(90deg, var(--synthesizer-border), transparent);
        }

        .verdict-divider-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--synthesizer-color);
          white-space: nowrap;
          letter-spacing: 0.05em;
        }

        /* ── Agent Turn ── */
        .agent-turn {
          border-radius: 14px;
          padding: 20px;
          border: 1px solid;
          position: relative;
          transition: all 0.3s ease;
        }

        .agent-turn--researcher {
          background: var(--researcher-bg);
          border-color: var(--researcher-border);
          box-shadow: var(--researcher-glow);
        }

        .agent-turn--critic {
          background: var(--critic-bg);
          border-color: var(--critic-border);
          box-shadow: var(--critic-glow);
        }

        .agent-turn--synthesizer {
          background: var(--synthesizer-bg);
          border-color: var(--synthesizer-border);
          box-shadow: var(--synthesizer-glow);
        }

        /* ── Agent Header ── */
        .agent-turn-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .agent-avatar {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          border: 1px solid;
          flex-shrink: 0;
        }

        .agent-avatar--researcher {
          background: var(--researcher-bg);
          border-color: var(--researcher-border);
        }

        .agent-avatar--critic {
          background: var(--critic-bg);
          border-color: var(--critic-border);
        }

        .agent-avatar--synthesizer {
          background: var(--synthesizer-bg);
          border-color: var(--synthesizer-border);
        }

        .agent-identity { flex: 1; }

        .agent-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .agent-name {
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.02em;
        }

        .agent-name--researcher { color: var(--researcher-color); }
        .agent-name--critic { color: var(--critic-color); }
        .agent-name--synthesizer { color: var(--synthesizer-color); }

        .agent-tagline {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: block;
          margin-top: 2px;
        }

        .agent-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }

        .streaming-indicator {
          display: flex;
          gap: 3px;
          align-items: center;
        }

        .streaming-indicator span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--neon-cyan);
          animation: bounce 1s infinite;
        }

        .streaming-indicator span:nth-child(2) { animation-delay: 0.15s; }
        .streaming-indicator span:nth-child(3) { animation-delay: 0.30s; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }

        .model-tag {
          font-size: 0.62rem;
          color: var(--text-muted);
          white-space: nowrap;
          padding: 2px 6px;
          background: var(--bg-input);
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
        }

        /* ── Agent Text (fallback / streaming) ── */
        .agent-text {
          font-size: 0.9rem;
          line-height: 1.8;
          color: var(--text-primary);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .cursor-blink {
          display: inline;
          color: var(--neon-cyan);
          animation: typingCursor 0.8s step-end infinite;
          font-weight: bold;
        }

        /* ── Structured Output ── */
        .structured-output {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .structured-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── Section Header ── */
        .section-header {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 0;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 4px;
        }

        .section-header-icon {
          font-size: 0.9rem;
        }

        .section-header-title {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .section-header--researcher .section-header-title { color: var(--researcher-color); }
        .section-header--critic .section-header-title { color: var(--critic-color); }
        .section-header--synthesizer .section-header-title { color: var(--synthesizer-color); }

        /* ── Section Prose ── */
        .section-prose {
          font-size: 0.88rem;
          line-height: 1.75;
          color: var(--text-primary);
        }

        /* ── Bullet Lists ── */
        .structured-bullets {
          display: flex;
          flex-direction: column;
          gap: 6px;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .structured-bullet {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.88rem;
          line-height: 1.6;
          color: var(--text-primary);
        }

        .bullet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 7px;
        }

        .structured-bullet--researcher .bullet-dot { background: var(--researcher-color); }
        .structured-bullet--critic .bullet-dot { background: var(--critic-color); }
        .structured-bullet--synthesizer .bullet-dot { background: var(--synthesizer-color); }

        .structured-bullets--risk .structured-bullet {
          background: rgba(255, 71, 87, 0.05);
          border: 1px solid rgba(255, 71, 87, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
        }

        /* ── Pain Point Chips ── */
        .pain-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pain-chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.4;
        }

        .pain-chip--researcher {
          background: var(--researcher-bg);
          border: 1px solid var(--researcher-border);
          color: var(--researcher-color);
        }

        .pain-chip--critic {
          background: var(--critic-bg);
          border: 1px solid var(--critic-border);
          color: var(--critic-color);
        }

        .pain-chip--synthesizer {
          background: var(--synthesizer-bg);
          border: 1px solid var(--synthesizer-border);
          color: var(--synthesizer-color);
        }

        /* ── Confidence Meter ── */
        .confidence-meter {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-input);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
        }

        .confidence-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .confidence-bar-track {
          flex: 1;
          height: 6px;
          background: var(--bg-void);
          border-radius: 3px;
          overflow: hidden;
        }

        .confidence-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease;
        }

        .confidence-bar-fill--researcher { background: linear-gradient(90deg, var(--researcher-color), #00ff87); }
        .confidence-bar-fill--critic { background: linear-gradient(90deg, var(--critic-color), #ff8c00); }
        .confidence-bar-fill--synthesizer { background: linear-gradient(90deg, var(--synthesizer-color), var(--neon-cyan)); }

        .confidence-score {
          font-size: 0.82rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
        }

        .confidence-score--researcher { color: var(--researcher-color); }
        .confidence-score--critic { color: var(--critic-color); }
        .confidence-score--synthesizer { color: var(--synthesizer-color); }

        /* ── Risk Badge ── */
        .risk-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid;
          width: fit-content;
        }

        .risk-critical { background: rgba(255,0,60,0.12); border-color: rgba(255,0,60,0.4); color: #ff003c; animation: glowPulse 1.5s ease-in-out infinite; }
        .risk-high { background: rgba(255,100,0,0.1); border-color: rgba(255,100,0,0.35); color: #ff6400; }
        .risk-medium { background: rgba(255,200,0,0.08); border-color: rgba(255,200,0,0.3); color: #ffd000; }
        .risk-low { background: rgba(0,255,100,0.07); border-color: rgba(0,255,100,0.25); color: #00ff64; }

        /* ── Targeted Claim Quote ── */
        .targeted-claim-quote {
          display: flex;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(255, 71, 87, 0.06);
          border-left: 3px solid var(--critic-color);
          border-radius: 0 8px 8px 0;
        }

        .quote-mark {
          font-size: 1.8rem;
          color: var(--critic-color);
          opacity: 0.4;
          line-height: 1;
          flex-shrink: 0;
          margin-top: -4px;
        }

        .targeted-claim-quote p {
          font-size: 0.88rem;
          line-height: 1.6;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* ── Verdict Box ── */
        .verdict-section {}

        .verdict-box {
          padding: 14px 18px;
          background: rgba(167, 139, 250, 0.08);
          border: 1px solid var(--synthesizer-border);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }

        .verdict-box::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--synthesizer-color), transparent);
        }

        .verdict-text {
          font-size: 0.95rem;
          line-height: 1.75;
          color: var(--text-primary);
          font-weight: 500;
        }

        /* ── Winning Pattern Badge ── */
        .winning-pattern-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, rgba(167,139,250,0.12), rgba(0,245,255,0.06));
          border: 1px solid var(--synthesizer-border);
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--synthesizer-color);
        }

        .winning-pattern-badge > span:first-child {
          font-size: 1rem;
          color: var(--neon-cyan);
        }

        /* ── Implementation Roadmap ── */
        .roadmap {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .roadmap-phase {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .roadmap-phase-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .roadmap-phase-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--synthesizer-bg);
          border: 2px solid var(--synthesizer-border);
          color: var(--synthesizer-color);
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .roadmap-phase-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--synthesizer-color);
          white-space: nowrap;
        }

        .roadmap-phase-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--synthesizer-border), transparent);
        }

        .roadmap-items {
          padding-left: 36px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          list-style: none;
        }

        .roadmap-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .roadmap-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--synthesizer-color);
          opacity: 0.5;
          flex-shrink: 0;
          margin-top: 7px;
        }

        /* ── Empty State ── */
        .timeline-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px 24px;
          text-align: center;
          gap: 16px;
        }

        .empty-icon {
          font-size: 3rem;
          animation: glowPulse 3s ease-in-out infinite;
        }

        .empty-title {
          font-size: 1.4rem;
          color: var(--text-primary);
          font-weight: 700;
        }

        .empty-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          max-width: 340px;
          line-height: 1.6;
        }

        .empty-agents {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 360px;
          margin-top: 8px;
        }

        .empty-agent-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid;
        }

        .empty-agent-card--researcher { background: var(--researcher-bg); border-color: var(--researcher-border); }
        .empty-agent-card--critic { background: var(--critic-bg); border-color: var(--critic-border); }
        .empty-agent-card--synthesizer { background: var(--synthesizer-bg); border-color: var(--synthesizer-border); }

        .empty-flow-diagram {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
        }

        .flow-node {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid;
        }

        .flow-node--researcher { background: var(--researcher-bg); border-color: var(--researcher-border); color: var(--researcher-color); }
        .flow-node--critic { background: var(--critic-bg); border-color: var(--critic-border); color: var(--critic-color); }
        .flow-node--synthesizer { background: var(--synthesizer-bg); border-color: var(--synthesizer-border); color: var(--synthesizer-color); }

        .flow-arrow {
          color: var(--text-muted);
          font-size: 1rem;
        }

        .flow-caption {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: -4px;
        }

        /* ── Loading ── */
        .timeline-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        /* ── Topic Label ── */
        .topic-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          margin-bottom: 4px;
        }

        .topic-label--researcher {
          background: var(--researcher-bg);
          border: 1px solid var(--researcher-border);
          color: var(--researcher-color);
        }

        .topic-label--critic {
          background: var(--critic-bg);
          border: 1px solid var(--critic-border);
          color: var(--critic-color);
        }

        .topic-label--synthesizer {
          background: var(--synthesizer-bg);
          border: 1px solid var(--synthesizer-border);
          color: var(--synthesizer-color);
        }

        /* ── Winner Badge ── */
        .winner-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 12px;
          border: 2px solid;
          position: relative;
          overflow: hidden;
        }

        .winner-badge::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--synthesizer-color), var(--neon-cyan), transparent);
        }

        .winner-badge--researcher {
          background: linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(0, 102, 255, 0.05));
          border-color: var(--researcher-border);
        }

        .winner-badge--critic {
          background: linear-gradient(135deg, rgba(255, 71, 87, 0.1), rgba(255, 140, 0, 0.05));
          border-color: var(--critic-border);
        }

        .winner-badge--hybrid {
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.12), rgba(0, 245, 255, 0.06));
          border-color: var(--synthesizer-border);
        }

        .winner-trophy {
          font-size: 1.6rem;
          animation: glowPulse 2s ease-in-out infinite;
        }

        .winner-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .winner-name {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--synthesizer-color);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: 'Orbitron', sans-serif;
        }

        /* ── Recommendation Callout ── */
        .recommendation-callout {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid;
        }

        .recommendation-callout--researcher {
          background: linear-gradient(135deg, rgba(0, 245, 255, 0.06), rgba(0, 255, 135, 0.03));
          border-color: var(--researcher-border);
        }

        .recommendation-callout > span:first-child {
          color: var(--neon-cyan);
          font-size: 1rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .recommendation-callout p {
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--text-primary);
          font-weight: 500;
        }
      `}</style>
    </div>);
};
export default AgentTimeline;
