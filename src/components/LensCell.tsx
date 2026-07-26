import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLens } from '../store';
import type { LensName } from '../types';

const labels: Record<LensName, string> = { contract: 'CONTRACT LENS', market: 'MARKET LENS', supply: 'SUPPLY LENS' };
const nodes: Record<LensName, string> = { contract: 'CT-LENS-00', market: 'MK-LENS-00', supply: 'SP-LENS-00' };
const markers: Record<LensName, string> = { contract: 'L1', market: 'L2', supply: 'L3' };

function scoreColour(score: number | null) {
  if (score === null) return 'var(--system-steel)';
  if (score <= 25) return 'var(--verdict-clear)';
  if (score <= 60) return 'var(--verdict-caution)';
  return 'var(--verdict-risk)';
}

function ScoreCount({ score }: { score: number }) {
  const value = useMotionValue(0);
  const rounded = useTransform(value, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(0);
  useMotionValueEvent(rounded, 'change', (next) => setDisplay(next));
  useEffect(() => {
    const controls = animate(value, score, { duration: 0.8, ease: 'easeOut' });
    return () => controls.stop();
  }, [score, value]);
  return <span>{display}</span>;
}

function ScanBars() {
  return <div className="scan-bars">{Array.from({ length: 6 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 0.11}s` }} />)}</div>;
}

function SkeletonLines() {
  return <div className="skeleton-lines"><i className="width-78" /><i className="width-60" /><i className="width-40" /><div className="skeleton-gap" /><i className="width-68" /><i className="width-60" /></div>;
}

export function LensCell({ name, onNeedSupply }: { name: LensName; onNeedSupply?: () => void }) {
  const lens = useLens(name);
  const isScanning = lens.status === 'scanning';
  const isPrompt = name === 'supply' && lens.status === 'prompt';
  const colour = scoreColour(lens.score);
  return (
    <motion.section className={`lens-cell lens-${name} ${isScanning ? 'lens-scanning' : ''}`} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}>
      <span className="cell-corner-label">{markers[name]}</span>
      <AnimatePresence mode="wait" initial={false}>
        {isScanning ? (
          <motion.div className="lens-content" key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="lens-tag lens-tag-active">{labels[name]} - SCANNING</span>
            <ScanBars />
            <SkeletonLines />
          </motion.div>
        ) : isPrompt ? (
          <motion.div className="lens-content lens-prompt" key="prompt" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <span className="lens-tag">{labels[name]}</span>
            <div className="prompt-copy">Add a vesting schedule to complete supply analysis.<button type="button" onClick={onNeedSupply}>PASTE TEXT OR UPLOAD IMAGE</button></div>
          </motion.div>
        ) : lens.status === 'complete' ? (
          <motion.div className="lens-content" key="complete" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: name === 'contract' ? 0 : name === 'market' ? 0.08 : 0.16 }}>
            <span className="lens-tag">{labels[name]}</span>
            <div className="score" style={{ color: colour }}><ScoreCount score={lens.score ?? 0} /></div>
            <p className="finding-summary">{lens.summary}</p>
            <div className="callout-list">{lens.findings.slice(0, 4).map((finding) => <div className="callout-row" key={`${finding.key}-${finding.value}`}><span className="callout-key">{finding.key.replaceAll('_', ' ')}</span><i className="callout-dot" style={{ backgroundColor: colour }} /><span className="callout-line" /><span className="callout-value">{finding.value}</span></div>)}</div>
          </motion.div>
        ) : (
          <motion.div className="lens-content lens-ghost" key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="lens-tag">{labels[name]}</span>
            <div className="ghost-score">- -</div>
            <SkeletonLines />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="cell-status">NODE {nodes[name]} | STATUS {isScanning ? 'SCANNING' : lens.status === 'complete' || isPrompt ? 'COMPLETE' : 'IDLE'} | FEED {statusFeed(lens.status)}</div>
    </motion.section>
  );
}

function statusFeed(status: string) {
  return status === 'idle' ? '--' : 'LIVE';
}
