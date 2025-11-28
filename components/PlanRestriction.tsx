import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowRight } from 'lucide-react';

interface PlanRestrictionProps {
  /** Название плана, начиная с которого доступна функция */
  requiredPlan: 'launch' | 'scale' | 'max';
  /** Название функции для отображения */
  featureName?: string;
  /** Дополнительные CSS классы */
  className?: string;
  /** Callback для навигации на страницу billing */
  onNavigateToBilling?: () => void;
}

/**
 * Компонент-оверлей для отображения ограничений плана
 * Показывает ненавязчивое уведомление с предложением апгрейда
 */
export const PlanRestriction: React.FC<PlanRestrictionProps> = ({
  requiredPlan,
  featureName,
  className = '',
  onNavigateToBilling,
}) => {
  const { t } = useTranslation();

  const planNames: Record<string, string> = {
    launch: 'Launch',
    scale: 'Scale',
    max: 'Max',
  };

  const handleClick = () => {
    if (onNavigateToBilling) {
      onNavigateToBilling();
    } else {
      // Fallback: используем localStorage для навигации (так работает App.tsx)
      localStorage.setItem('currentPage', 'billing');
      window.dispatchEvent(new Event('storage'));
      window.location.reload();
    }
  };

  return (
    <div className={`absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-[1px] rounded-lg z-10 flex items-center justify-center ${className}`}>
      <div className="text-center px-4 py-3 max-w-xs">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-3">
          <Lock size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
          {featureName || t('planRestriction.featureUnavailable')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t('planRestriction.availableFrom', { plan: planNames[requiredPlan] })}
        </p>
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 rounded-full hover:bg-blue-100/80 dark:hover:bg-blue-800/40 hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all shadow-sm"
        >
          {t('planRestriction.upgradePlan')}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

/**
 * Wrapper-компонент для секций с ограничением плана
 * Добавляет relative позиционирование и оверлей при необходимости
 */
interface RestrictedSectionProps {
  /** Разрешена ли функция */
  isAllowed: boolean;
  /** Название плана, начиная с которого доступна функция */
  requiredPlan: 'launch' | 'scale' | 'max';
  /** Название функции для отображения */
  featureName?: string;
  /** Дополнительные CSS классы */
  className?: string;
  children: React.ReactNode;
}

export const RestrictedSection: React.FC<RestrictedSectionProps> = ({
  isAllowed,
  requiredPlan,
  featureName,
  className = '',
  children,
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {!isAllowed && (
        <PlanRestriction requiredPlan={requiredPlan} featureName={featureName} />
      )}
    </div>
  );
};

export default PlanRestriction;
