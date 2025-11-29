import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  /** Size of the spinner icon */
  size?: 'sm' | 'md' | 'lg';
  /** Show text label below spinner */
  showText?: boolean;
  /** Custom text to display */
  text?: string;
  /** Additional CSS classes for container */
  className?: string;
  /** Whether to center in full container */
  fullPage?: boolean;
}

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  showText = true,
  text,
  className = '',
  fullPage = false,
}) => {
  const { t } = useTranslation();
  const displayText = text || t('common.loading', 'Загрузка...');

  const containerClasses = fullPage
    ? 'flex-1 flex flex-col items-center justify-center text-center min-h-[200px]'
    : 'flex flex-col items-center justify-center text-center p-10';

  return (
    <div className={`${containerClasses} ${className}`}>
      <Loader2
        size={sizeMap[size]}
        className="animate-spin text-[#0078D4] mb-4"
      />
      {showText && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {displayText}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
