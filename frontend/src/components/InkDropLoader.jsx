/** Carregamento a tinta: uma gota cai do pincel e abre uma onda no papel. Com movimento reduzido, a gota fica parada. */
export default function InkDropLoader({ label, className = '' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <span aria-hidden="true" className="relative flex h-10 w-10 items-end justify-center">
        <span className="absolute bottom-0.5 h-3 w-9 rounded-[50%] border-2 border-paint-cobalt/60 animate-ink-ripple motion-reduce:hidden" />
        <span className="mb-2 h-4 w-3 rounded-[50%_50%_50%_50%/38%_38%_62%_62%] bg-[#2A2421] animate-ink-drop motion-reduce:animate-none" />
      </span>
      {label && <span className="font-hand text-xl text-[#785132]">{label}</span>}
    </div>
  );
}
