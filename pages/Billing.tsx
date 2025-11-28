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
  Clock
} from 'lucide-react';
import { billingService, SubscriptionInfo } from '../src/services/api';

// --- Types & Data ---

type BillingCycle = 'monthly' | 'yearly';
type ResponseCount = 1000 | 5000 | 10000 | 15000 | 20000 | 50000;

const RESPONSE_OPTIONS: ResponseCount[] = [1000, 5000, 10000, 15000, 20000, 50000];

const PRICING_DATA: Record<ResponseCount, { launch: number | null; scale: number; max: number }> = {
  1000: { launch: 18, scale: 35, max: 60 },
  5000: { launch: null, scale: 171, max: 292 },
  10000: { launch: null, scale: 305, max: 550 },
  15000: { launch: null, scale: 578, max: 973 },
  20000: { launch: null, scale: 760, max: 1280 },
  50000: { launch: null, scale: 1800, max: 2900 },
};

// FAQs are now loaded from translations

export const Billing: React.FC = () => {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [responseCount, setResponseCount] = useState<ResponseCount>(15000);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
       
       {/* Header */}
       <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('billing.title')}</h1>
          
       {/* Current Plan Card - Polished to match screenshot */}
       <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
         <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="w-full md:flex-1 min-w-0 space-y-5">
               <div className="flex flex-wrap items-baseline gap-2">
                 <span className="text-xl font-bold text-gray-900 dark:text-white">{t('billing.yourCurrentPlan')}</span>
                 <span className="text-xl font-bold text-gray-500 dark:text-gray-400">{t('billing.trialPeriod')}</span>
               </div>

               <div className="flex flex-wrap items-center gap-8">
                 <div className={`flex items-center gap-2 font-medium ${
                   subscription?.isActive ? 'text-[#22C55E]' : 'text-red-500'
                 }`}>
                   <div className={`w-2 h-2 rounded-full ${
                     subscription?.isActive ? 'bg-[#22C55E]' : 'bg-red-500'
                   }`} />
                   <span>{t('billing.status')} {subscription?.isActive ? t('billing.statusActive') : t('billing.statusInactive')}</span>
                 </div>
                 <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                   <Calendar size={18} className="text-gray-400" />
                   <span>{t('billing.daysRemaining')} {subscription?.daysRemaining ?? 0}</span>
                 </div>
               </div>

               <div className="w-full pt-2">
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
                    <span>{t('billing.used')} {subscription?.responsesUsed ?? 0} {t('billing.of')} {formatNumber(subscription?.responsesLimit ?? 5000)}</span>
                    <span>{subscription?.usagePercentage ?? 0}{t('billing.usedPercent')}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-300 dark:bg-gray-500 rounded-full transition-all"
                        style={{ width: `${subscription?.usagePercentage ?? 0}%` }}
                      ></div>
                  </div>
               </div>
            </div>

            <div className="w-full md:w-auto md:flex-shrink-0 flex justify-end md:justify-start md:self-start md:mt-0">
                <button className="bg-[#B91C1C] hover:bg-[#991B1B] text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap text-sm">
                  {t('billing.manageSubscription')}
                </button>
            </div>
         </div>
       </div>

      {/* Controls (Centered) */}
      <div className="flex flex-col items-center gap-6 py-6">
         <div className="flex flex-wrap justify-center items-center gap-4">
            {/* Response Dropdown */}
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 px-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[48px]">
                <div className="relative group px-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium mr-2">{t('billing.aiResponses')}</span>
                  <select 
                    value={responseCount}
                    onChange={(e) => setResponseCount(Number(e.target.value) as ResponseCount)}
                    className="appearance-none bg-transparent pr-8 py-2 text-base font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    {RESPONSE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{formatNumber(opt)}</option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <ChevronDown size={18} />
                  </div>
                </div>
            </div>

            {/* Monthly/Yearly Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg h-[48px]">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all h-full flex items-center ${
                    billingCycle === 'monthly' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t('billing.monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all h-full flex items-center ${
                    billingCycle === 'yearly'
                      ? 'bg-[#0078D4] text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t('billing.yearly')}
                </button>
            </div>
         </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">

        {/* Trial Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col transition-colors hover:border-gray-300 dark:hover:border-gray-600">
           <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400">
              <Check size={20} className="text-gray-400" />
              <span className="font-bold text-lg">Trial</span>
           </div>

           <div className="mb-1 min-h-[60px]">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('billing.per15days')}</span>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t('billing.trialPeriod')}</div>
           </div>

           <div className="flex items-center gap-1 mb-6 h-4">
             <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">
                {t('billing.free')}
             </span>
           </div>

           <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-8">
              <p className="font-medium text-gray-900 dark:text-white">{t('billing.whatsIncluded')}</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start"><User size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.agents', { count: 3 })}</li>
                <li className="flex gap-3 items-start"><Book size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.kbArticles', { count: 100 })}</li>
                <li className="flex gap-3 items-start"><MessageSquare size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.responsesTotal', { count: 500 })}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.instructionsLimit', { count: '30,000' })}</li>
                <li className="flex gap-3 items-start text-amber-600 dark:text-amber-500"><Clock size={16} className="mt-0.5 shrink-0"/> {t('billing.daysOfUse', { count: 15 })}</li>
              </ul>
           </div>

           <button className="w-full py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 rounded-lg text-sm font-bold cursor-not-allowed">
             {t('billing.currentPlanButton')}
           </button>
        </div>

        {/* Launch Plan */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl border p-6 flex flex-col transition-all duration-300 relative ${prices.launch === null ? 'opacity-60 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
           <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400">
              <Zap size={20} fill="currentColor" className="text-gray-400" />
              <span className="font-bold text-lg">Launch</span>
           </div>
           
           <div className="mb-1 min-h-[60px]">
              {prices.launch !== null ? (
                <>
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">${getPrice(prices.launch)}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('billing.perMonth')}</span>
                </>
              ) : (
                 <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 pt-2 block">{t('billing.notAvailable')}</span>
              )}
           </div>

           <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 h-4">
             {prices.launch === null ? t('billing.notAvailableForResponses') : ''}
           </p>

           <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-8">
              <p className="font-medium text-gray-900 dark:text-white">{t('billing.whatsIncluded')}</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start"><User size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.agents', { count: 5 })}</li>
                <li className="flex gap-3 items-start"><Book size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.kbArticles', { count: 500 })}</li>
                <li className="flex gap-3 items-start"><MessageSquare size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.responsesPerMonth', { count: formatNumber(responseCount) })}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.instructionsLimit', { count: '60,000' })}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.sendMedia')}</li>
              </ul>
           </div>

           <button
             disabled={prices.launch === null}
             className={`w-full py-3 rounded-lg text-sm font-bold transition-colors border ${
               prices.launch === null
                 ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                 : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
             }`}
           >
             {prices.launch === null ? t('billing.notAvailable') : t('billing.selectPlan')}
           </button>
        </div>

        {/* Scale Plan (Highlighted) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-[#0078D4] dark:border-[#0078D4] p-6 flex flex-col relative shadow-xl transition-colors">
           <div className="absolute -top-3 right-4 bg-[#0078D4] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide shadow-sm">
             {t('billing.mostPopular')}
           </div>
           <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
              <div className="bg-[#0078D4] rounded-full p-1"><Star size={12} className="text-white" fill="currentColor" /></div>
              <span className="font-bold text-lg">Scale</span>
           </div>

           <div className="mb-1 min-h-[60px]">
              <span className="text-5xl font-extrabold text-gray-900 dark:text-white">${getPrice(prices.scale)}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('billing.perMonth')}</span>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t('billing.paidMonthly')}</div>
           </div>

           <div className="flex items-center gap-1 mb-6 h-4">
             <span className="text-xs font-medium text-[#0078D4] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                <Info size={10} className="inline mr-1 mb-0.5"/>
                {t('billing.aboutPerConvo', { price: '0.13' })}
             </span>
           </div>

           <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-8">
              <p className="font-medium text-gray-900 dark:text-white">{t('billing.whatsIncluded')}</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start"><User size={16} className="text-[#0078D4] mt-0.5 shrink-0"/> {t('billing.agents', { count: 10 })}</li>
                <li className="flex gap-3 items-start"><Book size={16} className="text-[#0078D4] mt-0.5 shrink-0"/> {t('billing.kbArticles', { count: '100,000' })}</li>
                <li className="flex gap-3 items-start"><MessageSquare size={16} className="text-[#0078D4] mt-0.5 shrink-0"/> {t('billing.responsesPerMonth', { count: formatNumber(responseCount) })}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-[#0078D4]">•</span> {t('billing.instructionsLimit', { count: '60,000' })}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-[#0078D4]">•</span> {t('billing.sendMedia')}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-[#0078D4]">•</span> {t('billing.incomingVoice')}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-[#0078D4]">•</span> {t('billing.incomingImages')}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-[#0078D4]">•</span> {t('billing.updateDealsContacts')}</li>
              </ul>
           </div>

           <button className="w-full py-3 bg-[#0078D4] hover:bg-[#006cbd] text-white rounded-lg text-sm font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
             {t('billing.selectPlan')} <ArrowRight size={16} />
           </button>
        </div>

        {/* Max Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col transition-colors hover:border-gray-300 dark:hover:border-gray-600">
           <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
              <Crown size={20} />
              <span className="font-bold text-lg">Max</span>
           </div>

           <div className="mb-1 min-h-[60px]">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">${getPrice(prices.max)}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('billing.perMonth')}</span>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t('billing.paidMonthly')}</div>
           </div>

           <div className="flex items-center gap-1 mb-6 h-4">
             <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                <Info size={10} className="inline mr-1 mb-0.5"/>
                {t('billing.aboutPerConvo', { price: '0.23' })}
             </span>
           </div>

           <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 flex-1 mb-8">
              <p className="font-medium text-gray-900 dark:text-white">{t('billing.whatsIncluded')}</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start"><User size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.unlimitedAgents')}</li>
                <li className="flex gap-3 items-start"><Book size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.unlimitedKbArticles')}</li>
                <li className="flex gap-3 items-start"><MessageSquare size={16} className="text-gray-400 mt-0.5 shrink-0"/> {t('billing.responsesPerMonth', { count: formatNumber(responseCount) })}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.instructionsLimit', { count: '120,000' })}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.sendMedia')}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.incomingVoice')}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.incomingImages')}</li>
                <li className="flex gap-3 items-start"><span className="w-4 h-4 flex items-center justify-center text-gray-400">•</span> {t('billing.updateDealsContacts')}</li>
              </ul>
           </div>

           <button className="w-full py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
             {t('billing.selectPlan')} <ArrowRight size={16} />
           </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
         <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">{t('billing.faqTitle')}</h2>
         <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">{t('billing.faqSubtitle')}</p>
         
         <div className="space-y-4">
            {FAQS.map((faq, index) => (
               <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors">
                  <button 
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    {faq.question}
                    {openFaqIndex === index ? <Minus size={16} className="text-blue-500" /> : <Plus size={16} className="text-gray-400" />}
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-6 pb-4 pt-0 text-sm text-gray-600 dark:text-gray-300 animate-fadeIn">
                       {faq.answer}
                    </div>
                  )}
               </div>
            ))}
         </div>
      </div>

    </div>
  );
};