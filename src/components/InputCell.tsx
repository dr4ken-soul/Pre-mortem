import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useAnalysisStore } from '../store';
import type { ChainId } from '../types';

interface Props { onSubmit: () => void; openSupply?: boolean; submitting?: boolean }

export function InputCell({ onSubmit, openSupply = false, submitting = false }: Props) {
  const status = useAnalysisStore((state) => state.systemStatus);
  const address = useAnalysisStore((state) => state.contractAddress);
  const chainId = useAnalysisStore((state) => state.chainId);
  const supplyDataRaw = useAnalysisStore((state) => state.supplyDataRaw);
  const setAddress = useAnalysisStore((state) => state.setAddress);
  const setChain = useAnalysisStore((state) => state.setChain);
  const setSupplyData = useAnalysisStore((state) => state.setSupplyData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [supplyOpen, setSupplyOpen] = useState(false);

  useEffect(() => {
    if (openSupply) setSupplyOpen(true);
  }, [openSupply]);

  async function readImage(file: File) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('The vesting image could not be read.'));
      reader.readAsDataURL(file);
    });
    setSupplyData(supplyDataRaw, data);
  }

  return (
    <section className={`input-cell ${status === 'scanning' ? 'input-cell-scanning' : ''}`}>
      <AnimatePresence mode="wait" initial={false}>
        {status === 'scanning' ? (
          <motion.div key="scanning" className="input-scanning" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="input-main scanning-main">
              <span className="cell-tag">ANALYZING - CONTRACT ADDRESS</span>
              <div className="scanning-address">{address}</div>
              <div className="progress-sweep"><div className="progress-sweep-inner" /></div>
              <div className="scanning-status"><i className="pulse-dot" />RUNNING ALL THREE LENSES IN PARALLEL</div>
            </div>
            <div className="input-actions"><span className="analysing-label">ANALYZING</span></div>
          </motion.div>
        ) : (
          <motion.div key="entry" className="input-entry" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="input-main">
              <span className="cell-tag">ANALYSIS INPUT - CONTRACT OR TOKEN ADDRESS</span>
              <p className="descriptor">Paste any contract or token address. Premortem runs all three lenses in parallel and returns a single verdict.</p>
              <input className="address-input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x - paste contract or token address" aria-label="Contract or token address" />
              <button className="supply-toggle" type="button" onClick={() => setSupplyOpen((open) => !open)} aria-expanded={supplyOpen}>VESTING SCHEDULE - optional, add for supply analysis <span>{supplyOpen ? '-' : '+'}</span></button>
              <AnimatePresence initial={false}>
                {supplyOpen && (
                  <motion.div className="supply-expander" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <textarea value={supplyDataRaw} onChange={(event) => setSupplyData(event.target.value)} placeholder="Paste vesting table text here, or upload a screenshot below" rows={4} />
                    <button className="upload-zone" type="button" onClick={() => fileRef.current?.click()}>Drop vesting schedule screenshot here or click to upload</button>
                    <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImage(file); }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="input-actions">
              <div className="chain-selector" aria-label="Select chain">
                {(['xlayer', 'base'] as ChainId[]).map((chain) => <button key={chain} className={chainId === chain ? 'chain-selected' : ''} type="button" onClick={() => setChain(chain)}>{chain === 'xlayer' ? 'XLAYER' : 'BASE'}</button>)}
              </div>
              <button className="run-button" type="button" disabled={!address.trim() || submitting} aria-busy={submitting} onClick={onSubmit}>{submitting ? 'STARTING...' : 'RUN ANALYSIS'}</button>
              <span className="verdict-hint">{submitting ? 'connecting to analysis service' : 'verdict will appear here'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
