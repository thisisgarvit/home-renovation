import { useState } from 'react';
import { useApp } from '../app/state';
import { DEMO, FAMILY } from '../config';
import { TEXT_SIZES } from '../lib/constants';

export function Who() {
  const { me, setMe, lastUser, textSize, setTextSize, nav, needCode, submitCode } = useApp();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [checking, setChecking] = useState(false);

  return (
    <main className="main">
      <div className="stack g24" style={{ paddingTop: '3.5rem' }}>
        <div className="stack g8">
          <div className="kicker">Home renovation{DEMO ? ' (demo)' : ''}</div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.015em' }}>Who is using the app?</h2>
          <p className="t16 muted pretty">Your name is saved with everything you add, change or tick off.</p>
        </div>

        {needCode && (
          <form
            className="card pad stack g12"
            onSubmit={async (e) => {
              e.preventDefault();
              setChecking(true);
              const ok = await submitCode(code);
              setChecking(false);
              setCodeError(ok ? '' : "That code didn't work. Check it with the family and try again.");
            }}
          >
            <label className="stack g8">
              <span className="label">Family code</span>
              <span className="t15 muted">Type it once on this phone. It keeps the family's data private.</span>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" enterKeyHint="done" />
            </label>
            {codeError && <p className="t15" style={{ color: 'var(--danger)' }} role="alert">{codeError}</p>}
            <button type="submit" className="btn btn-primary" disabled={!code.trim() || checking}>{checking ? 'Checking…' : 'Continue'}</button>
          </form>
        )}

        <div className="stack g12">
          {FAMILY.map((p) => {
            const isLast = p === lastUser || (!lastUser && p === me);
            return (
              <button
                key={p}
                type="button"
                disabled={needCode}
                onClick={() => { setMe(p); nav({ screen: 'tasks' }, 'replace'); }}
                className="row g16"
                style={{ minHeight: '4.75rem', padding: '0.75rem 1rem', border: `1.5px solid ${isLast ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 'var(--r-card)', background: 'var(--card)', textAlign: 'left', opacity: needCode ? 0.5 : 1 }}
              >
                <span className="avatar avatar-lg">{p[0]}</span>
                <span className="stack">
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{p}</span>
                  {isLast && lastUser && <span className="t15 muted">Used the app last</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="stack g8">
          <div id="tsize" className="label">Text size</div>
          <div role="group" aria-labelledby="tsize" className="grid3">
            {TEXT_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={textSize === s.id}
                onClick={() => setTextSize(s.id)}
                className={`choice centered${textSize === s.id ? ' on' : ''}`}
                style={{ minHeight: '4rem', flexDirection: 'column', gap: '0.125rem' }}
              >
                <span style={{ fontSize: `${s.sample}px`, fontWeight: 800, lineHeight: 1 }}>Aa</span>
                <span className="t14">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
