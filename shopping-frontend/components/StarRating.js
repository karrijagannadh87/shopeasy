import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, count, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={
              i <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200'
            }
          />
        ))}
      </span>
      <span className="text-xs font-medium text-slate-600">{Number(rating).toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-xs text-slate-400">({count})</span>
      )}
    </span>
  );
}
