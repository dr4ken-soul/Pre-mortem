import { useAnalysisStore } from '../store';

export function Navigation() {
  const status = useAnalysisStore((state) => state.systemStatus);
  const label = status.toUpperCase();
  return (
    <nav className="navigation-strip">
      <div className="wordmark">premortem</div>
      <div className="system-status">
        <span className="system-label">SYSTEM STATUS</span>
        <span className="system-value">{label}<i className={`status-dot status-dot-${status}`} /></span>
      </div>
    </nav>
  );
}
