import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Star,
  Crown,
  Zap,
  ChevronDown,
  Plus,
  Minus,
  ArrowRight,
  Info,
  User,
  Book,
  MessageSquare,
  Calendar,
  Clock,
  HelpCircle,
  Infinity,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { billingService, SubscriptionInfo } from '../src/services/api';

// --- Types & Data ---

type BillingCycle = 'monthly' | 'yearly';
type ResponseCount = 1000 | 5000 | 10000 | 15000 | 20000 | 50000 | 'custom';

const RESPONSE_OPTIONS: ResponseCount[] = [1000, 5000, 10000, 15000, 20000, 50000, 'custom'];

// Средний разговор содержит 3.5 ответа AI (5-8 сообщений всего)
const AVG_RESPONSES_PER_CONVERSATION = 3.5;

const PRICING_DATA: Record<ResponseCount, { launch: number | null; scale: number | null; max: number | null }> = {
  1000: { launch: 18, scale: 35, max: 60 },
  5000: { launch: null, scale: 171, max: 292 },
  10000: { launch: null, scale: 305, max: 550 },
  15000: { launch: null, scale: 578, max: 973 },
  20000: { launch: null, scale: 760, max: 1280 },
  50000: { launch: null, scale: 1800, max: 2900 },
  custom: { launch: null, scale: null, max: null },
};

// Проверка на кастомный пакет (50,000+)
const isCustomPlan = (count: ResponseCount) => count === 'custom';

// Компонент tooltip для цены за разговор - Modern design
interface PriceTooltipProps {
  price: string;
  variant: 'blue' | 'gray';
}

const PriceTooltip: React.FC<PriceTooltipProps> = ({ price, variant }) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  const bgClass = variant === 'blue'
    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50'
    : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 border border-gray-200/80 dark:border-gray-600/50';

  return (
    <div className="relative inline-block">
      <span
        className={`text-xs font-medium ${bgClass} px-2.5 py-1 rounded-lg cursor-help flex items-center gap-1.5 transition-all hover:scale-105`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info size={12} className="opacity-70" />
        {t('billing.aboutPerConvo', { price })}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 z-50 animate-fadeIn">
          <div className="bg-gray-900 dark:bg-gray-950 text-white text-xs rounded-xl p-4 shadow-2xl backdrop-blur-xl border border-gray-700/50">
            <p className="mb-2 leading-relaxed">
              {t('billing.tooltipLine1')}
            </p>
            <p className="text-gray-400 leading-relaxed">
              {t('billing.tooltipLine2')}
            </p>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-900 dark:border-t-gray-950"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// FAQs are now loaded from translations

export const Billing: React.FC = () => {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [responseCount, setResponseCount] = useState<ResponseCount>(1000);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // FAQs loaded from translations
  const FAQS = [
    { question: t('billing.faq1q'), answer: t('billing.faq1a') },
    { question: t('billing.faq2q'), answer: t('billing.faq2a') },
    { question: t('billing.faq3q'), answer: t('billing.faq3a') },
    { question: t('billing.faq4q'), answer: t('billing.faq4a') },
    { question: t('billing.faq5q'), answer: t('billing.faq5a') },
  ];

  // Загружаем информацию о подписке
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const data = await billingService.getSubscription();
        setSubscription(data);
      } catch (error) {
        console.error('Failed to load subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const prices = PRICING_DATA[responseCount];
  
  // Calculate yearly discount (e.g., 20%)
  const getPrice = (basePrice: number | null) => {
    if (basePrice === null) return null;
    return billingCycle === 'yearly' ? Math.floor(basePrice * 0.8) : basePrice;
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const formatNumber = (num: number | string) => {
    if (num === 'custom') return '50,000+';
    return new Intl.NumberFormat('en-US').format(num as number);
  };

  // Проверка на безлимит (-1)
  const isUnlimitedValue = (value: number) => value === -1;

  // Форматирование лимита (с учетом безлимита)
  const formatLimit = (limit: number) => {
    if (isUnlimitedValue(limit)) return t('billing.unlimited', 'Безлимит');
    return formatNumber(limit);
  };

  // Расчет цены за разговор (1 разговор ≈ 3.5 ответа AI)
  const getPricePerConversation = (planPrice: number | null) => {
    const price = getPrice(planPrice);
    if (price === null || responseCount === 'custom') return '0.00';
    // Количество разговоров = ответы / среднее кол-во ответов на разговор
    const conversationsCount = responseCount / AVG_RESPONSES_PER_CONVERSATION;
    return (price / conversationsCount).toFixed(2);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
       
       {/* Header */}
       <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('billing.title')}</h1>
          
       {/* Grace Period / Expired Warning Banner - Modern design */}
       {subscription?.subscriptionStatus === 'grace_period' && (
         <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/80 dark:border-amber-700/50 rounded-2xl p-5 flex items-center gap-5 backdrop-blur-sm">
           <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-full -mr-16 -mt-16" />
           <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
             <Clock className="w-6 h-6 text-white" />
           </div>
           <div className="flex-1 relative">
             <p className="font-semibold text-amber-900 dark:text-amber-100">
               {t('billing.gracePeriodWarning', { count: subscription?.gracePeriodDaysRemaining ?? 0 })}
             </p>
             <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">{t('billing.gracePeriodInfo')}</p>
           </div>
           <button className="relative bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02]">
             {t('billing.renewSubscription')}
           </button>
         </div>
       )}

       {subscription?.subscriptionStatus === 'expired' && (
         <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/80 dark:border-red-700/50 rounded-2xl p-5 flex items-center gap-5 backdrop-blur-sm">
           <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full -mr-16 -mt-16" />
           <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
             <Clock className="w-6 h-6 text-white" />
           </div>
           <div className="flex-1 relative">
             <p className="font-semibold text-red-900 dark:text-red-100">{t('billing.subscriptionExpired')}</p>
             <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">{t('billing.subscriptionExpiredMessage')}</p>
           </div>
           <button className="relative bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02]">
             {t('billing.renewSubscription')}
           </button>
         </div>
       )}

       {/* Current Plan Card - Modern glassmorphism design */}
       <div className="relative group">
         {/* Gradient glow effect behind card */}
         <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

         <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-lg">
           <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="w-full md:flex-1 min-w-0 space-y-5">
                 {/* Plan name with gradient text for premium plans */}
                 <div className="flex flex-wrap items-center gap-3">
                   <span className="text-lg font-medium text-gray-500 dark:text-gray-400">{t('billing.yourCurrentPlan')}</span>
                   <span className={`text-2xl font-bold ${
                     subscription?.plan === 'unlimited' || subscription?.plan === 'max'
                       ? 'bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent'
                       : subscription?.plan === 'scale'
                       ? 'text-[#0078D4]'
                       : 'text-gray-900 dark:text-white'
                   }`}>
                     {subscription?.planDisplayName || t('billing.trialPeriod')}
                   </span>
                 </div>

                 {/* Status indicators with modern design */}
                 <div className="flex flex-wrap items-center gap-6">
                   <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl ${
                     subscription?.isActive
                       ? 'bg-emerald-50 dark:bg-emerald-900/20'
                       : 'bg-red-50 dark:bg-red-900/20'
                   }`}>
                     <div className={`relative w-2.5 h-2.5 rounded-full ${
                       subscription?.isActive ? 'bg-emerald-500' : 'bg-red-500'
                     }`}>
                       {subscription?.isActive && (
                         <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                       )}
                     </div>
                     <span className={`text-sm font-semibold ${
                       subscription?.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                     }`}>
                       {subscription?.isActive ? t('billing.statusActive') : t('billing.statusInactive')}
                     </span>
                   </div>

                   {/* Скрываем дни для unlimited плана */}
                   {subscription?.plan !== 'unlimited' && (
                     <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
                       <Calendar size={16} className="text-gray-400" />
                       <span className="text-sm">
                         {subscription?.subscriptionStatus === 'grace_period'
                           ? t('billing.daysLeft', { count: subscription?.gracePeriodDaysRemaining ?? 0 })
                           : `${t('billing.daysRemaining')} ${subscription?.daysRemaining ?? 0}`
                         }
                       </span>
                     </div>
                   )}
                   {subscription?.subscriptionEndsAt && subscription?.subscriptionStatus === 'active' && (
                     <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                       <span>
                         {t('billing.subscriptionEndsAt', {
                           date: new Date(subscription.subscriptionEndsAt).toLocaleDateString()
                         })}
                       </span>
                     </div>
                   )}
                 </div>

                 {/* Usage progress with gradient */}
                 <div className="w-full pt-2">
                    {(subscription?.plan === 'unlimited' || isUnlimitedValue(subscription?.responsesLimit ?? 0)) ? (
                      // Для безлимитного плана показываем красивый badge
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <TrendingUp size={16} className="text-gray-400" />
                          <span>{t('billing.used')} <span className="font-semibold">{formatNumber(subscription?.responsesUsed ?? 0)}</span></span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-purple-200/50 dark:border-purple-700/50 rounded-full backdrop-blur-sm">
                          <Infinity size={16} className="text-purple-500" />
                          <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                            {t('billing.unlimited', 'Безлимит')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm mb-3">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {t('billing.used')} <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(subscription?.responsesUsed ?? 0)}</span> {t('billing.of')} {formatNumber(subscription?.responsesLimit ?? 5000)}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">{subscription?.usagePercentage ?? 0}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${subscription?.usagePercentage ?? 0}%` }}
                            />
                        </div>
                      </>
                    )}
                 </div>
              </div>

              <div className="w-full md:w-auto md:flex-shrink-0 flex justify-end md:justify-start md:self-start md:mt-0">
                  <button className="px-5 py-2.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg text-sm">
                    {t('billing.manageSubscription')}
                  </button>
              </div>
           </div>
         </div>
       </div>

      {/* Controls (Centered) - Modern pill design */}
      <div className="flex flex-col items-center gap-8 py-8">
         <div className="flex flex-wrap justify-center items-center gap-4">
            {/* Response Dropdown - Sleek design */}
            <div className="flex items-center bg-white dark:bg-gray-800/90 backdrop-blur-sm px-5 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 h-[52px] gap-3">
                <MessageSquare size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('billing.aiResponses')}</span>
                <div className="relative">
                  <select
                    value={responseCount}
                    onChange={(e) => setResponseCount(e.target.value === 'custom' ? 'custom' : Number(e.target.value) as ResponseCount)}
                    className="appearance-none bg-gray-50 dark:bg-gray-700/50 px-4 pr-9 py-1.5 rounded-xl text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
                  >
                    {RESPONSE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt === 'custom' ? '50,000+' : formatNumber(opt)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
            </div>

            {/* Monthly/Yearly Toggle - Modern pill with indicator */}
            <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl h-[52px]">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative z-10 px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    billingCycle === 'monthly'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('billing.monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`relative z-10 px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('billing.yearly')}
                  {billingCycle === 'yearly' && (
                    <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-bold">-20%</span>
                  )}
                </button>
                {/* Sliding indicator */}
                <div
                  className={`absolute top-1.5 bottom-1.5 rounded-xl transition-all duration-300 ease-out ${
                    billingCycle === 'monthly'
                      ? 'left-1.5 w-[calc(50%-3px)] bg-white dark:bg-gray-700 shadow-sm'
                      : 'left-[calc(50%)] w-[calc(50%-3px)] bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg'
                  }`}
                />
            </div>
         </div>
      </div>

      {/* Plans Grid - Modern cards with hover effects */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-stretch">

        {/* Trial Plan - Minimal design */}
        <div className="group relative bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/80 dark:border-gray-700/80 p-6 flex flex-col transition-all duration-300 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-1">
           <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Check size={18} className="text-gray-500" />
              </div>
              <span className="font-bold text-lg text-gray-700 dark:text-gray-300">Trial</span>
           </div>

           <div className="mb-2 min-h-[60px]">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium ml-1">{t('billing.per15days')}</span>
           </div>

           <div className="flex items-center gap-2 mb-6 h-5">
             <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                {t('billing.free')}
             </span>
           </div>

           <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-8">
              <p className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">{t('billing.whatsIncluded')}</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-center"><User size={15} className="text-gray-400 shrink-0"/> {t('billing.agents', { count: 3 })}</li>
                <li className="flex gap-3 items-center"><Book size={15} className="text-gray-400 shrink-0"/> {t('billing.kbArticles', { count: 10 })}</li>
                <li className="flex gap-3 items-center"><MessageSquare size={15} className="text-gray-400 shrink-0"/> {t('billing.responsesTotal', { count: 500 })}</li>
                <li className="flex gap-3 items-center"><span className="w-4 h-4 flex items-center justify-center text-gray-400 text-xs">•</span> {t('billing.instructionsLimit', { value: '10,000' })}</li>
                <li className="flex gap-3 items-center text-amber-600 dark:text-amber-400"><Clock size={15} className="shrink-0"/> {t('billing.daysOfUse', { count: 15 })}</li>
              </ul>
           </div>

           <button className="w-full py-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-xl text-sm font-semibold cursor-not-allowed">
             {t('billing.currentPlanButton')}
           </button>
        </div>

        {/* Launch Plan - Clean modern design */}
        <div className={`group relative bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border p-6 flex flex-col transition-all duration-300 ${prices.launch === null ? 'opacity-50 border-gray-200 dark:border-gray-700' : 'border-gray-200/80 dark:border-gray-700/80 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-1'}`}>
           <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Zap size={18} className="text-amber-500" fill="currentColor" />
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">Launch</span>
           </div>

           <div className="mb-2 min-h-[60px]">
              {prices.launch !== null && !isCustomPlan(responseCount) ? (
                <>
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">${getPrice(prices.launch)}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm font-medium ml-1">{t('billing.perMonth')}</span>
                </>
              ) : (
                 <span className="text-xl font-bold text-gray-300 dark:text-gray-600 pt-2 block">{t('billing.notAvailable')}</span>
              )}
           </div>

           <div className="flex items-center gap-2 mb-6 h-5">
             {prices.launch === null || isCustomPlan(responseCount) ? (
               <span className="text-xs text-gray-400 dark:text-gray-500">
                 {t('billing.notAvailableForResponses')}
               </span>
             ) : (
               <PriceTooltip price={getPricePerConversation(prices.launch)} variant="gray" />
             )}
           </div>

           <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-8">
              <p className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">{t('billing.whatsIncluded')}</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-center"><User size={15} className="text-gray-400 shrink-0"/> {t('billing.agents', { count: 5 })}</li>
                <li className="flex gap-3 items-center"><Book size={15} className="text-gray-400 shrink-0"/> {t('billing.kbArticles', { count: 20 })}</li>
                <li className="flex gap-3 items-center"><MessageSquare size={15} className="text-gray-400 shrink-0"/> {t('billing.responsesPerMonth', { value: formatNumber(responseCount) })}</li>
                <li className="flex gap-3 items-center"><span className="w-4 h-4 flex items-center justify-center text-gray-400 text-xs">•</span> {t('billing.instructionsLimit', { value: '20,000' })}</li>
                <li className="flex gap-3 items-center"><span className="w-4 h-4 flex items-center justify-center text-gray-400 text-xs">•</span> {t('billing.sendMedia')}</li>
              </ul>
           </div>

           <button
             disabled={prices.launch === null || isCustomPlan(responseCount)}
             className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
               prices.launch === null || isCustomPlan(responseCount)
                 ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                 : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
             }`}
           >
             {prices.launch === null || isCustomPlan(responseCount) ? t('billing.notAvailable') : t('billing.selectPlan')}
           </button>
        </div>

        {/* Scale Plan (Highlighted) - Premium featured card */}
        <div className="group relative">
           {/* Glow effect */}
           <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300" />

           <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-500/50 dark:border-blue-400/50 p-6 flex flex-col shadow-xl h-full">
             {/* Popular badge */}
             <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
               <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                 <Sparkles size={12} />
                 {t('billing.mostPopular')}
               </div>
             </div>

             <div className="flex items-center gap-2.5 mb-5 mt-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Star size={18} className="text-white" fill="currentColor" />
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">Scale</span>
             </div>

             <div className="mb-2 min-h-[60px]">
                {isCustomPlan(responseCount) ? (
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent pt-2 block">{t('billing.contactUs', 'Связаться с нами')}</span>
                ) : (
                  <>
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">${getPrice(prices.scale)}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium ml-1">{t('billing.perMonth')}</span>
                  </>
                )}
             </div>

             <div className="flex items-center gap-2 mb-6 h-5">
               {isCustomPlan(responseCount) ? (
                 <span className="text-xs text-blue-500 dark:text-blue-400">
                   {t('billing.customPlanDescription', 'Индивидуальные условия')}
                 </span>
               ) : (
                 <PriceTooltip price={getPricePerConversation(prices.scale)} variant="blue" />
               )}
             </div>

             <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-8">
                <p className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">{t('billing.whatsIncluded')}</p>
                <ul className="space-y-3">
                  <li className="flex gap-3 items-center"><User size={15} className="text-blue-500 shrink-0"/> {t('billing.agents', { count: 10 })}</li>
                  <li className="flex gap-3 items-center"><Book size={15} className="text-blue-500 shrink-0"/> {t('billing.kbArticles', { count: 100 })}</li>
                  <li className="flex gap-3 items-center"><MessageSquare size={15} className="text-blue-500 shrink-0"/> {t('billing.responsesPerMonth', { value: formatNumber(responseCount) })}</li>
                  <li className="flex gap-3 items-center"><Check size={15} className="text-blue-500 shrink-0" /> {t('billing.instructionsLimit', { value: '60,000' })}</li>
                  <li className="flex gap-3 items-center"><Check size={15} className="text-blue-500 shrink-0" /> {t('billing.sendMedia')}</li>
                  <li className="flex gap-3 items-center"><Check size={15} className="text-blue-500 shrink-0" /> {t('billing.incomingVoice')}</li>
                  <li className="flex gap-3 items-center"><Check size={15} className="text-blue-500 shrink-0" /> {t('billing.incomingImages')}</li>
                  <li className="flex gap-3 items-center"><Check size={15} className="text-blue-500 shrink-0" /> {t('billing.updateDealsContacts')}</li>
                </ul>
             </div>

             <button className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] flex items-center justify-center gap-2">
               {isCustomPlan(responseCount) ? t('billing.contactUs', 'Связаться с нами') : t('billing.selectPlan')} <ArrowRight size={16} />
             </button>
           </div>
        </div>

        {/* Max Plan - Premium dark theme */}
        <div className="group relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-900 dark:via-gray-850 dark:to-black rounded-2xl p-6 flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 overflow-hidden">
           {/* Subtle gradient overlay */}
           <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

           <div className="relative flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Crown size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg text-white">Max</span>
              <span className="ml-auto text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pro</span>
           </div>

           <div className="relative mb-2 min-h-[60px]">
              {isCustomPlan(responseCount) ? (
                <span className="text-xl font-bold text-amber-400 pt-2 block">{t('billing.contactUs', 'Связаться с нами')}</span>
              ) : (
                <>
                  <span className="text-4xl font-extrabold text-white">${getPrice(prices.max)}</span>
                  <span className="text-gray-400 text-sm font-medium ml-1">{t('billing.perMonth')}</span>
                </>
              )}
           </div>

           <div className="relative flex items-center gap-2 mb-6 h-5">
             {isCustomPlan(responseCount) ? (
               <span className="text-xs text-amber-400/80">
                 {t('billing.customPlanDescription', 'Индивидуальные условия')}
               </span>
             ) : (
               <PriceTooltip price={getPricePerConversation(prices.max)} variant="gray" />
             )}
           </div>

           <div className="relative space-y-4 text-sm text-gray-300 flex-1 mb-8">
              <p className="font-semibold text-white text-xs uppercase tracking-wider">{t('billing.whatsIncluded')}</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-center"><User size={15} className="text-amber-400 shrink-0"/> <span className="text-amber-400 font-medium">{t('billing.unlimitedAgents')}</span></li>
                <li className="flex gap-3 items-center"><Book size={15} className="text-amber-400 shrink-0"/> <span className="text-amber-400 font-medium">{t('billing.unlimitedKbArticles')}</span></li>
                <li className="flex gap-3 items-center"><MessageSquare size={15} className="text-gray-400 shrink-0"/> {t('billing.responsesPerMonth', { value: formatNumber(responseCount) })}</li>
                <li className="flex gap-3 items-center"><Check size={15} className="text-gray-400 shrink-0" /> {t('billing.instructionsLimit', { value: '120,000' })}</li>
                <li className="flex gap-3 items-center"><Check size={15} className="text-gray-400 shrink-0" /> {t('billing.sendMedia')}</li>
                <li className="flex gap-3 items-center"><Check size={15} className="text-gray-400 shrink-0" /> {t('billing.incomingVoice')}</li>
                <li className="flex gap-3 items-center"><Check size={15} className="text-gray-400 shrink-0" /> {t('billing.incomingImages')}</li>
                <li className="flex gap-3 items-center"><Check size={15} className="text-gray-400 shrink-0" /> {t('billing.updateDealsContacts')}</li>
              </ul>
           </div>

           <button className="relative w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all duration-200 backdrop-blur-sm border border-white/10 flex items-center justify-center gap-2">
             {isCustomPlan(responseCount) ? t('billing.contactUs', 'Связаться с нами') : t('billing.selectPlan')} <ArrowRight size={16} />
           </button>
        </div>
      </div>

      {/* FAQ Section - Modern accordion design */}
      <div className="max-w-3xl mx-auto pt-8">
         <div className="text-center mb-10">
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('billing.faqTitle')}</h2>
           <p className="text-gray-500 dark:text-gray-400 text-sm">{t('billing.faqSubtitle')}</p>
         </div>

         <div className="space-y-3">
            {FAQS.map((faq, index) => (
               <div
                 key={index}
                 className={`bg-white dark:bg-gray-800/90 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 ${
                   openFaqIndex === index
                     ? 'border-blue-200 dark:border-blue-800/50 shadow-lg shadow-blue-500/5'
                     : 'border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600'
                 }`}
               >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                  >
                    <span className={`text-sm font-medium transition-colors ${
                      openFaqIndex === index
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {faq.question}
                    </span>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      openFaqIndex === index
                        ? 'bg-blue-100 dark:bg-blue-900/30 rotate-0'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {openFaqIndex === index
                        ? <Minus size={16} className="text-blue-500" />
                        : <Plus size={16} className="text-gray-500" />
                      }
                    </div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${
                    openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-6 pb-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                       {faq.answer}
                    </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
};