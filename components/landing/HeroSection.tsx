import React from 'react';
import { Link } from 'react-router-dom';
import { MagneticButton } from '../ui/MagneticButton';

interface HeroSectionProps {
  isVisible: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isVisible }) => {
  return (
    <section className="relative flex h-screen w-screen flex-shrink-0 items-center justify-center px-6 md:px-12">
      <div className="max-w-4xl text-center">
        <h1
          className={`mb-6 font-sans text-5xl font-bold leading-tight tracking-tight text-white transition-all duration-1000 md:text-7xl lg:text-8xl ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          AI Агенты для
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            вашего бизнеса
          </span>
        </h1>
        <p
          className={`mx-auto mb-10 max-w-2xl font-sans text-lg text-white/70 transition-all delay-200 duration-1000 md:text-xl ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          Автоматизируйте продажи, поддержку клиентов и бизнес-процессы
          с помощью интеллектуальных AI-ассистентов
        </p>
        <div
          className={`flex flex-col items-center justify-center gap-4 transition-all delay-400 duration-1000 sm:flex-row ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <Link to="/register">
            <MagneticButton variant="primary" size="lg">
              Попробовать бесплатно
            </MagneticButton>
          </Link>
          <MagneticButton variant="secondary" size="lg">
            Узнать больше
          </MagneticButton>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className={`absolute bottom-12 left-1/2 -translate-x-1/2 transition-all delay-700 duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-white/50">
          <span className="text-xs uppercase tracking-widest">Прокрутите</span>
          <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/30 p-1">
            <div className="h-2 w-1 animate-bounce rounded-full bg-white/50" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
