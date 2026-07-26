import { useAnalysisStore } from '../store';

export function Background() {
  const status = useAnalysisStore((state) => state.systemStatus);
  return <><div className="dot-grid" /><div className={`scan-line ${status === 'scanning' ? 'scan-active' : ''}`} /></>;
}
