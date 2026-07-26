import { AnimatePresence, motion } from 'motion/react';
import { useAnalysisStore } from '../store';

function verdictColour(verdict: string | undefined) {
  if (verdict === 'High Risk') return 'var(--verdict-risk)';
  if (verdict === 'Caution') return 'var(--verdict-caution)';
  return 'var(--verdict-clear)';
}

export function VerdictCell() {
  const status = useAnalysisStore((state) => state.systemStatus);
  const verdict = useAnalysisStore((state) => state.verdict);
  const address = useAnalysisStore((state) => state.contractAddress);
  const newScan = useAnalysisStore((state) => state.newScan);
  return (
    <section className="verdict-cell" style={{ borderLeftColor: status === 'complete' ? verdictColour(verdict?.verdict) : 'var(--border-default)' }}>
      <AnimatePresence mode="wait" initial={false}>
        {status === 'complete' && verdict ? (
          <motion.div key="verdict" className="verdict-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="verdict-main"><span className="cell-tag">VERDICT</span><motion.h1 initial={{ filter: 'blur(8px)', opacity: 0 }} animate={{ filter: 'blur(0px)', opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}>{verdict.verdict}</motion.h1><span className="verdict-address">{address}</span></div>
            <div className="verdict-actions"><div className="recommendation"><span>RECOMMENDATION</span><strong style={{ color: verdictColour(verdict.verdict) }}>{verdict.recommendation}</strong></div><button className="new-scan-button" type="button" onClick={newScan}>NEW SCAN</button></div>
          </motion.div>
        ) : status === 'scanning' ? (
          <motion.div key="scanning-verdict" className="verdict-scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="cell-tag">ANALYZING - CONTRACT ADDRESS</span><span className="verdict-scanning-copy">Three lenses are collecting evidence.</span></motion.div>
        ) : (
          <motion.div key="empty-verdict" className="verdict-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="cell-tag">ANALYSIS INPUT</span><span className="verdict-empty-copy">The verdict surface will populate after your first scan.</span></motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
