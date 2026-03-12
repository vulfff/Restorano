import { useState } from 'react';
import type { MealSummary } from '../../types/meal';

// Mock TheMealDB data
const MOCK_MEALS: MealSummary[] = [
  { idMeal: '52772', strMeal: 'Teriyaki Chicken Casserole', strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg', strCategory: 'Chicken', strArea: 'Japanese' },
  { idMeal: '52771', strMeal: 'Spicy Arrabiata Penne', strMealThumb: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg', strCategory: 'Pasta', strArea: 'Italian' },
  { idMeal: '52770', strMeal: 'Spaghetti Bolognese', strMealThumb: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg', strCategory: 'Beef', strArea: 'Italian' },
];

export default function MealSuggestions() {
  const [keyword, setKeyword] = useState('');
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    // Simulate API delay with mock data
    setTimeout(() => {
      setMeals(MOCK_MEALS);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Dish Suggestions (optional)
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. pasta, chicken..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {searched && (
        <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
          {meals.length === 0 ? (
            <div className="text-sm text-slate-400 italic">No results found.</div>
          ) : (
            meals.map((meal) => (
              <div key={meal.idMeal} className="flex gap-3 items-center bg-slate-50 rounded-lg p-2">
                <img
                  src={meal.strMealThumb}
                  alt={meal.strMeal}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">{meal.strMeal}</div>
                  <div className="text-xs text-slate-500">{meal.strCategory} · {meal.strArea}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
