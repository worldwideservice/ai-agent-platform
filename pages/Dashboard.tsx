import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { analyticsService } from '../src/services/api';
import { MessageSquare, TrendingUp, Zap, Bot, TrendingDown } from 'lucide-react';

interface DashboardStats {
  responsesThisMonth: number;
  responsesLast7Days: number;
  responsesToday: number;
  totalAgents: number;
  changePercent: string;
  trend: 'up' | 'down';
  miniChartData: number[];
}

interface ChartData {
  name: string;
  value: number;
}

// Hook for animated number counting
const useAnimatedNumber = (targetValue: number, duration: number = 1500, delay: number = 0) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (targetValue === 0) {
      setDisplayValue(0);
      return;
    }

    const startAnimation = () => {
      startTimeRef.current = null;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

        // Easing function: easeOutExpo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        setDisplayValue(Math.floor(eased * targetValue));

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration, delay]);

  return displayValue;
};

// Sparkline component
interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color, height = 40 }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} 100,${height}`;

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkline-gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Stat Card component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sparklineData: number[];
  sparklineColor: string;
  trend?: { value: string; isPositive: boolean };
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  sparklineData,
  sparklineColor,
  trend,
  delay
}) => {
  const animatedValue = useAnimatedNumber(value, 1500, delay + 200);

  return (
    <div
      className={`
        animate-stagger animate-fadeInUp
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-sm p-6
        transition-all duration-300
        hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600
        hover:-translate-y-1
        group
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        {/* Icon with light background - project style */}
        <div className={`
          w-11 h-11 rounded-xl
          ${iconBg}
          flex items-center justify-center
          transition-transform duration-300
          group-hover:scale-110
        `}>
          {React.cloneElement(icon as React.ReactElement<any>, {
            size: 20,
            className: iconColor
          })}
        </div>

        {/* Trend indicator */}
        {trend && (
          <div className={`
            flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold
            ${trend.isPositive
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }
          `}>
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </p>

      {/* Animated Value */}
      <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums mb-4">
        {animatedValue.toLocaleString()}
      </p>

      {/* Sparkline */}
      <div className="h-10 -mx-1">
        <Sparkline data={sparklineData} color={sparklineColor} />
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    responsesThisMonth: 0,
    responsesLast7Days: 0,
    responsesToday: 0,
    totalAgents: 0,
    changePercent: '0%',
    trend: 'up',
    miniChartData: []
  });
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [hourlyData, setHourlyData] = useState<ChartData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const analytics = await analyticsService.getDashboardAnalytics();

      setStats(analytics.stats);
      setMonthlyData(analytics.charts.monthlyData);
      setHourlyData(analytics.charts.hourlyData);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(t('dashboard.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate sparkline data for each card
  const generateSparklineData = (baseData: number[], multiplier: number = 1) => {
    if (baseData.length > 0) return baseData.slice(-7);
    // Fallback mock data
    return [12, 19, 15, 25, 22, 30, 28].map(v => v * multiplier);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse"></div>
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          {/* Error Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-red-500 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Title */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('dashboard.errorTitle', 'Не удалось загрузить данные')}
          </h2>

          {/* Error Description */}
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error}
          </p>

          {/* Retry Button */}
          <button
            onClick={loadAnalytics}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0078D4] hover:bg-[#006cbd] text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('common.retry', 'Повторить')}
          </button>
        </div>
      </div>
    );
  }

  const trendValue = stats.changePercent || '+0%';
  const isPositiveTrend = stats.trend === 'up';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('dashboard.subtitle', 'Мониторинг активности ваших AI агентов')}
          </p>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('dashboard.responsesThisMonth')}
          value={stats.responsesThisMonth}
          icon={<MessageSquare />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-500"
          sparklineData={generateSparklineData(stats.miniChartData)}
          sparklineColor="#3B82F6"
          trend={{ value: trendValue, isPositive: isPositiveTrend }}
          delay={0}
        />

        <StatCard
          title={t('dashboard.responsesLast7Days')}
          value={stats.responsesLast7Days}
          icon={<TrendingUp />}
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          iconColor="text-purple-500"
          sparklineData={generateSparklineData(stats.miniChartData, 0.7)}
          sparklineColor="#A855F7"
          delay={100}
        />

        <StatCard
          title={t('dashboard.responsesToday')}
          value={stats.responsesToday}
          icon={<Zap />}
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          iconColor="text-amber-500"
          sparklineData={generateSparklineData(stats.miniChartData, 0.3)}
          sparklineColor="#F59E0B"
          delay={200}
        />

        <StatCard
          title={t('dashboard.agents')}
          value={stats.totalAgents}
          icon={<Bot />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          iconColor="text-emerald-500"
          sparklineData={[stats.totalAgents, stats.totalAgents, stats.totalAgents, stats.totalAgents, stats.totalAgents, stats.totalAgents, stats.totalAgents]}
          sparklineColor="#10B981"
          delay={300}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <div
          className="animate-stagger animate-fadeInUp bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 transition-colors"
          style={{ animationDelay: '400ms' }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('dashboard.responsesThisMonth')}
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {monthlyData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">{t('dashboard.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    dy={10}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(75, 85, 99, 0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
                      color: '#E5E7EB'
                    }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ stroke: '#4B5563', strokeDasharray: '5 5' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#colorMonthly)"
                    dot={false}
                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={2000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily Chart */}
        <div
          className="animate-stagger animate-fadeInUp bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 transition-colors"
          style={{ animationDelay: '500ms' }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('dashboard.responsesPerDay')}
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {hourlyData.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500">{t('dashboard.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                    interval={2}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(75, 85, 99, 0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
                      color: '#E5E7EB'
                    }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ stroke: '#4B5563', strokeDasharray: '5 5' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#colorDaily)"
                    dot={false}
                    activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={2000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
