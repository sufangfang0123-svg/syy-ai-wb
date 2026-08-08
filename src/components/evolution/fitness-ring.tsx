export function FitnessRing({ value, size = 132, label = "进化适应度" }: { value: number; size?: number; label?: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} aria-label={`${label} ${value}分`}>
      <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="54" cy="54" r={radius} fill="none" stroke="#E5E9E6" strokeWidth="7" />
        <circle cx="54" cy="54" r={radius} fill="none" stroke="#5B8C5A" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute text-center"><p className="text-3xl font-semibold text-[#315C46]">{value}</p><p className="text-[10px] uppercase tracking-wider text-[#7D8B85]">{label}</p></div>
    </div>
  );
}
