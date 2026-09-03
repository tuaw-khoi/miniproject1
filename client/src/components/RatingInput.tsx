import { Star } from "lucide-react";

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function RatingInput({ value, onChange }: RatingInputProps) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Condition rating">
      {[1, 2, 3, 4, 5].map((rating) => {
        const selected = rating <= value;

        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            title={`${rating} star rating`}
            onClick={() => onChange(rating)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
              selected
                ? "border-amber-300 bg-amber-50 text-amber-500"
                : "border-slate-200 bg-white text-slate-300"
            }`}
          >
            <Star
              className="h-6 w-6"
              fill={selected ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
