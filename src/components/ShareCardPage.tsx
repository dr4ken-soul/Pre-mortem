import { useMemo } from 'react';

export function ShareCardPage() {
  const { address, chain } = useMemo(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return { address: parts[1] ?? '', chain: parts[2] ?? 'base' };
  }, []);
  const imageUrl = `/api/card/${encodeURIComponent(address)}/${encodeURIComponent(chain)}?v=${Date.now()}`;
  const downloadUrl = `/api/card/${encodeURIComponent(address)}/${encodeURIComponent(chain)}/download`;

  return (
    <main className="share-page">
      <div className="share-page-toolbar">
        <span className="share-page-wordmark">premortem</span>
        <div className="share-page-actions">
          <a className="share-page-back" href="/">BACK TO SCAN</a>
          <a className="share-page-download" href={downloadUrl}>DOWNLOAD PNG</a>
        </div>
      </div>
      <div className="share-page-frame"><img src={imageUrl} alt="Premortem verdict share card" /></div>
      <p className="share-page-hint">The download saves the generated verdict card only.</p>
    </main>
  );
}
