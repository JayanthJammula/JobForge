interface Props {
  score: number;
  size?: number;
}

export function MatchScoreRing({ score, size = 64 }: Props) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "text-green-500" :
    score >= 60 ? "text-yellow-500" :
    score >= 40 ? "text-orange-500" :
    "text-red-500";

  const strokeColor =
    score >= 80 ? "#22c55e" :
    score >= 60 ? "#eab308" :
    score >= 40 ? "#f97316" :
    "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className={`absolute text-sm font-bold ${color}`}>{Math.round(score)}%</span>
    </div>
  );
}
