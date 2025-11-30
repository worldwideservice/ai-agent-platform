import React from 'react';
import { Link } from 'react-router-dom';
import { MagneticButton } from '../ui/MagneticButton';

interface LandingHeaderProps {
  currentSection: number;
  scrollToSection: (index: number) => void;
  isLoaded: boolean;
}

const navItems = ['Главная', 'Возможности', 'Сервисы', 'О нас', 'Контакты'];

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  currentSection,
  scrollToSection,
  isLoaded,
}) => {
  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6 transition-opacity duration-700 md:px-12 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <button
        onClick={() => scrollToSection(0)}
        className="flex items-center gap-2 transition-transform hover:scale-105"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/25">
          <span className="font-sans text-xl font-bold text-white">G</span>
        </div>
        <span className="font-sans text-xl font-semibold tracking-tight text-white">
          GPT Агент
        </span>
      </button>

      <div className="hidden items-center gap-8 md:flex">
        {navItems.map((item, index) => (
          <button
            key={item}
            onClick={() => scrollToSection(index)}
            className={`group relative font-sans text-sm font-medium transition-colors ${
              currentSection === index
                ? 'text-white'
                : 'text-white/80 hover:text-white'
            }`}
          >
            {item}
            <span
              className={`absolute -bottom-1 left-0 h-px bg-white transition-all duration-300 ${
                currentSection === index ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <MagneticButton variant="ghost" size="default">
            Войти
          </MagneticButton>
        </Link>
        <Link to="/register">
          <MagneticButton variant="primary" size="default">
            Начать бесплатно
          </MagneticButton>
        </Link>
      </div>
    </nav>
  );
};

export default LandingHeader;
