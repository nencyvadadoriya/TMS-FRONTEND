import { Star, TrendingUp } from 'lucide-react';
import { toAvatarUrl } from '../utils/avatar';

type EmployeeOfTheMonthCardProps = {
  title?: string;
  name: string;
  rating: number;
  performance: string;
  avg: string;
  photoUrl?: string;
  summaryRows?: Array<{
    email: string;
    name: string;
    avatar?: string;
    avgStarsLabel: string;
    total: number;
    performance: string;
  }>;
};

const clampRating = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
};

const EmployeeOfTheMonthCard = ({
  title = 'Employee of the Month',
  name,
  rating,
  performance,
  avg,
  photoUrl,
  summaryRows,
}: EmployeeOfTheMonthCardProps) => {
  const safeRating = clampRating(rating);
  const fullStars = Math.floor(safeRating);
  const hasHalf = safeRating - fullStars >= 0.5;
  const topAvatarUrl = toAvatarUrl(photoUrl);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">Top performer for this month</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
          <Star className="h-4 w-4" />
          <span className="text-sm font-medium">{safeRating.toFixed(1)}/5</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 overflow-hidden flex items-center justify-center">
            {topAvatarUrl ? (
              <img src={topAvatarUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="text-lg font-semibold text-blue-700">{(name || 'U').trim().charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{name}</p>
            <div className="mt-1 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, idx) => {
                const starIndex = idx + 1;
                const filled = starIndex <= fullStars;
                const half = !filled && hasHalf && starIndex === fullStars + 1;
                return (
                  <Star
                    key={idx}
                    className={`h-4 w-4 ${filled || half ? 'text-amber-500' : 'text-gray-300'}`}
                    fill={filled || half ? 'currentColor' : 'none'}
                    style={half ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Performance</p>
            <div className="mt-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-gray-900">{performance}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Avg</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{avg}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Rating</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{safeRating.toFixed(1)} / 5</p>
          </div>
        </div>
      </div>

      {Array.isArray(summaryRows) && summaryRows.length > 0 && (
        <div className="mt-5 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">Assistance Ratings</p>
            <p className="text-xs text-gray-500">Avg stars • Review count • Performance</p>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Avg</th>
                  <th className="py-2 pr-4 font-medium">Reviews</th>
                  <th className="py-2 pr-4 font-medium">Performance</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r) => (
                  <tr key={r.email} className="border-t border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {toAvatarUrl((r as any)?.avatar) ? (
                            <img src={toAvatarUrl((r as any)?.avatar)} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-sm font-semibold text-blue-700">{(r.name || 'U').trim().charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="truncate">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{r.avgStarsLabel}</td>
                    <td className="py-2 pr-4 text-gray-700">{r.total}</td>
                    <td className="py-2 pr-4 text-gray-700">{r.performance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeOfTheMonthCard;
