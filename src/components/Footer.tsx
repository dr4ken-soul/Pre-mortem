import { useEffect, useState } from 'react';

function utcTime() {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date());
}

export function Footer() {
  const [time, setTime] = useState('--:--:-- UTC');
  useEffect(() => {
    setTime(`${utcTime()} UTC`);
    const timer = window.setInterval(() => setTime(`${utcTime()} UTC`), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <footer className="footer-strip">SYSTEM PREMORTEM v1.0.0 | ENV PRODUCTION | LAYER XLAYER BASE | TIME {time}</footer>;
}
