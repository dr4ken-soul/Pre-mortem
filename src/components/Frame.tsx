export function Frame({ children }: { children: React.ReactNode }) {
  return <main className="frame"><span className="frame-plus frame-plus-tl">+</span><span className="frame-plus frame-plus-tr">+</span><span className="frame-plus frame-plus-bl">+</span><span className="frame-plus frame-plus-br">+</span>{children}</main>;
}
