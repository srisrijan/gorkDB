export default function CandidateCard({ candidate, onExecute, isExecuting }) {
  const { authorization, validation, impact } = candidate
  const allowed = authorization?.allowed
  const valid = validation?.valid

  return (
    <div className={`candidate ${allowed ? 'allowed' : 'blocked'}`}>
      <div className="candidate-header">
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{candidate.label}</span>
        <span className={`badge ${allowed ? 'badge-allowed' : 'badge-blocked'}`}>
          {allowed ? '✓ Authorized' : '✗ Blocked'}
        </span>
        <span className="badge badge-op">{candidate.operation_type}</span>
        {candidate.is_risky && <span className="badge badge-risky">⚠ Risky</span>}
        {!valid && <span className="badge badge-blocked">Invalid SQL</span>}
      </div>

      <pre className="sql-code">{candidate.sql}</pre>

      <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '10px 0 6px' }}>
        {candidate.explanation}
      </p>

      {/* Impact */}
      {impact && (
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 8 }}>
          {impact.estimated_rows != null
            ? `Estimated rows: ${impact.estimated_rows}`
            : 'Row estimate unavailable'}
          {impact.risk_reason && (
            <span style={{ color: '#fb923c', marginLeft: 8 }}> ⚠ {impact.risk_reason}</span>
          )}
        </div>
      )}

      {/* Auth block reason */}
      {!allowed && (
        <div className="alert alert-error" style={{ marginBottom: 8 }}>
          {authorization.reason}
        </div>
      )}

      {/* Validation hints */}
      {validation?.suggestions?.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 8 }}>
          {validation.suggestions.join(' · ')}
        </div>
      )}

      {/* Tables/columns involved */}
      <div className="detail-row">
        {candidate.tables_involved.map(t => (
          <span key={t} className="tag">📋 {t}</span>
        ))}
        {candidate.columns_involved.slice(0, 6).map(c => (
          <span key={c} className="tag">{c}</span>
        ))}
        {candidate.columns_involved.length > 6 && (
          <span className="tag">+{candidate.columns_involved.length - 6} more</span>
        )}
      </div>

      {allowed && valid && (
        <div style={{ marginTop: 14 }}>
          {candidate.is_risky && (
            <div className="alert alert-warning" style={{ marginBottom: 10 }}>
              This operation is flagged as risky. Please review the SQL carefully before executing.
            </div>
          )}
          <button
            className="btn btn-success"
            onClick={() => onExecute(candidate.sql)}
            disabled={isExecuting}
          >
            {isExecuting && <span className="spinner" />}
            Run Query
          </button>
        </div>
      )}
    </div>
  )
}
