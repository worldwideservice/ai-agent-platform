import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingDown, Calendar, Layers } from 'lucide-react';

// Reset data to zeros as requested for initial state
const data = [
  { name: 'июнь 2025', val: 0 },
  { name: 'июль 2025', val: 0 },
  { name: 'август 2025', val: 0 },
  { name: 'сентябрь 2025', val: 0 },
  { name: 'октябрь 2025', val: 0 },
  { name: 'ноябрь 2025', val: 0 },
];

const dailyData = Array.from({ length: 14 }, (_, i) => ({
  name: `ноя ${7 + i}`,
  val: 0
}));

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Ответы ИИ за этот месяц</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">0</div>
          <div className="flex items-center text-gray-400 text-sm font-medium">
            <span className="mr-1">Нет данных</span>
          </div>
          <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-0"></div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Ответы ИИ за последние 7 дней</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">0</div>
          <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium cursor-pointer hover:underline">
            <span className="mr-1">Последние 7 дней</span>
            <Calendar size={16} />
          </div>
          <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full"></div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Ответы ИИ сегодня</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">0</div>
          <div className="mt-8 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full"></div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Агенты</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">1</div>
          <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium cursor-pointer hover:underline">
            <span className="mr-1">Всего агентов</span>
            <Layers size={16} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Ответы ИИ за этот месяц</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF', fontSize: 12}}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke="#0284c7" 
                  strokeWidth={2} 
                  dot={{fill: '#0284c7', r: 4}} 
                  activeDot={{r: 6}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Ответы ИИ за день</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF', fontSize: 10}}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9CA3AF', fontSize: 12}}
                  domain={[0, 1]}
                  ticks={[0, 0.4, 0.8]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke="#0284c7" 
                  strokeWidth={2} 
                  dot={{fill: '#0284c7', r: 4}} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};