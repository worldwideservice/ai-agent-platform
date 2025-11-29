import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'success' | 'purple' | 'muted';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Show loading spinner and disable button */
  loading?: boolean;
  /** Text to show when loading (optional) */
  loadingText?: string;
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#0078D4] hover:bg-[#006cbd] disabled:bg-[#0078D4]/70 text-white shadow-sm',
  secondary: 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600',
  danger: 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/70 text-white',
  ghost: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700',
  warning: 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-600/70 text-white',
  success: 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/70 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/70 text-white',
  muted: 'bg-gray-500 hover:bg-gray-600 disabled:bg-gray-500/70 text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={iconSizes[size]} className="animate-spin" />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
