import { useCallback, useState } from 'react';
import { Background } from './components/Background';
import { CornerMarkers } from './components/CornerMarkers';
import { Footer } from './components/Footer';
import { Frame } from './components/Frame';
import { InputCell } from './components/InputCell';
import { LensCell } from './components/LensCell';
import { Navigation } from './components/Navigation';
import { AudioCell, ShareCell } from './components/UtilityCells';
import { VerdictCell } from './components/VerdictCell';
import { ShareCardPage } from './components/ShareCardPage';
import { createAnalysis, streamAnalysis } from './lib/api';
import { useAnalysisStore } from './store';

export default function App() {
  if (window.location.pathname.startsWith('/share/')) return <ShareCardPage />;

  return <Dashboard />;
}

function Dashboard() {
  const state = useAnalysisStore();
  const [supplyInCell, setSupplyInCell] = useState(false);

  const runAnalysis = useCallback(async () => {
    try {
      const id = await createAnalysis(state);
      setSupplyInCell(false);
      state.begin(id);
      streamAnalysis(id, {
        lens: state.completeLens,
        verdict: state.setVerdict,
        asset: state.setAsset,
        done: state.finish,
        error: state.fail,
      });
    } catch (error) {
      state.fail(error instanceof Error ? error.message : 'The analysis could not be started.');
    }
  }, [state]);

  const openSupplyCellInput = () => {
    setSupplyInCell(true);
  };

  const showInput = state.systemStatus !== 'complete' || supplyInCell;

  return (
    <div className="app-shell">
      <Background />
      <CornerMarkers />
      <Navigation />
      <Frame>
        <div className="bento-grid">
          {showInput ? <InputCell onSubmit={() => void runAnalysis()} openSupply={supplyInCell} /> : <VerdictCell />}
          <LensCell name="contract" />
          <LensCell name="market" />
          <LensCell name="supply" onNeedSupply={openSupplyCellInput} />
          <AudioCell />
          <ShareCell />
        </div>
      </Frame>
      {state.error ? <div className="error-banner" role="alert">{state.error}</div> : null}
      <Footer />
    </div>
  );
}
