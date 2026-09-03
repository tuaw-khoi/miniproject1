import { Building2, CalendarClock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { Survey } from "../types/survey";
import { formatDateTime } from "../utils/format";
import { StatusBadge } from "./StatusBadge";

interface SurveyCardProps {
  survey: Survey;
}

export function SurveyCard({ survey }: SurveyCardProps) {
  const title =
    survey.building && survey.room
      ? `${survey.building}${survey.floor ? ` floor ${survey.floor}` : ""} - ${
          survey.room
        }`
      : "Unfinished draft";

  return (
    <Link
      to={`/surveys/${survey.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-vku-200 hover:shadow-soft"
    >
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-vku-50 text-vku-700">
          {survey.photo ? (
            <img
              src={survey.photo}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Building2 className="h-7 w-7" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-950">
                {title}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {survey.category}
              </p>
            </div>
            <StatusBadge status={survey.status} />
          </div>

          <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDateTime(survey.updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
