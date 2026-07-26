import { useEffect, useRef, useState } from 'react';
import { useAnalysisStore } from '../store';

function Waveform({ playing }: { playing: boolean }) {
  const heights = [8, 14, 10, 20, 12, 24, 16, 10, 18, 13, 22, 9];
  return <div className={`waveform ${playing ? 'waveform-playing' : ''}`}>{heights.map((height, index) => <i key={index} style={{ height: `${height}px`, animationDelay: `${index * 0.06}s` }} />)}</div>;
}

export function AudioCell() {
  const audioUrl = useAnalysisStore((state) => state.verdict?.audioUrl);
  const audioScript = useAnalysisStore((state) => state.verdict?.audioScript);
  const audioDurationSeconds = useAnalysisStore((state) => state.verdict?.audioDurationSeconds ?? 0);
  const status = useAnalysisStore((state) => state.systemStatus);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const isLocalFallback = audioUrl ? new URL(audioUrl, window.location.origin).searchParams.get('format') === 'browser' : false;

  useEffect(() => () => { audioRef.current?.pause(); window.speechSynthesis?.cancel(); }, []);
  useEffect(() => {
    if (status !== 'complete') {
      window.speechSynthesis?.cancel();
      setPlaying(false);
    }
  }, [status]);
  function toggle() {
    if (!audioUrl) return;
    if (isLocalFallback && audioScript && 'speechSynthesis' in window) {
      if (playing) { window.speechSynthesis.cancel(); setPlaying(false); }
      else speakFallback();
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
      audioRef.current.addEventListener('error', () => setFailed(true));
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); return; }
    void audioRef.current.play().then(() => setPlaying(true)).catch(() => setFailed(true));
  }
  function speakFallback() {
    if (!audioScript || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(audioScript);
    utterance.rate = 0.92;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
  }
  const ready = status === 'complete' && Boolean(audioUrl);
  return (
    <div className={`utility-cell audio-cell ${ready ? 'utility-ready' : ''}`}>
      <span className="cell-corner-label">AUDIO BRIEF</span>
      {ready ? <><div className="audio-controls"><button className="play-button" type="button" onClick={failed ? speakFallback : toggle} aria-label={playing ? 'Pause audio brief' : 'Play audio brief'}>{playing ? <span className="pause-icon"><i /><i /></span> : <span className="play-icon" />}</button><Waveform playing={playing} /><span className="audio-duration">{formatDuration(audioDurationSeconds)}</span></div><span className="utility-label">AUDIO BRIEF</span></> : <><div className="ghost-circle" /><span className="utility-label">AUDIO BRIEF</span></>}
      <div className="cell-status">NODE ABR-00 | STATUS {ready ? 'READY' : 'IDLE'}</div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function ShareCell() {
  const shareCardUrl = useAnalysisStore((state) => state.verdict?.shareCardUrl);
  const ready = Boolean(shareCardUrl);
  return (
    <div className={`utility-cell share-cell ${ready ? 'utility-ready' : ''}`}>
      <span className="cell-corner-label">SHARE VERDICT</span>
      {ready ? <><button className="share-button" type="button" onClick={() => window.open(shareCardUrl ?? '', '_blank', 'noopener,noreferrer')}>OPEN CARD</button><span className="share-note">DOWNLOAD ON CARD PAGE</span></> : <><span className="share-ghost-label">SHARE VERDICT</span><div className="ghost-circle" /></>}
      <div className="cell-status">NODE SHR-00 | STATUS {ready ? 'READY' : 'IDLE'}</div>
    </div>
  );
}
