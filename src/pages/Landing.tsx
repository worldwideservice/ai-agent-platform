import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { Shader, ChromaFlow, Swirl } from 'shaders/react';
import { CustomCursor } from '../../components/landing/CustomCursor';
import { GrainOverlay } from '../../components/landing/GrainOverlay';
import { WorkSection } from '../../components/landing/WorkSection';
import { ServicesSection } from '../../components/landing/ServicesSection';
import { AboutSection } from '../../components/landing/AboutSection';
import { ContactSection } from '../../components/landing/ContactSection';
import { MagneticButton } from '../../components/landing/MagneticButton';

export function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'ru' ? 'en' : 'ru';
    changeLanguage(newLang);
  };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navItems = [
    t('landing.nav.home'),
    t('landing.nav.capabilities'),
    t('landing.nav.features'),
    t('landing.nav.about'),
    t('landing.nav.contacts'),
  ];
  const [currentSection, setCurrentSection] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const shaderContainerRef = useRef<HTMLDivElement>(null);
  const scrollThrottleRef = useRef<number>();

  useEffect(() => {
    const checkShaderReady = () => {
      if (shaderContainerRef.current) {
        const canvas = shaderContainerRef.current.querySelector('canvas');
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          setIsLoaded(true);
          return true;
        }
      }
      return false;
    };

    if (checkShaderReady()) return;

    const intervalId = setInterval(() => {
      if (checkShaderReady()) {
        clearInterval(intervalId);
      }
    }, 100);

    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const scrollToSection = (index: number) => {
    if (scrollContainerRef.current) {
      const sectionWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: sectionWidth * index,
        behavior: 'smooth',
      });
      setCurrentSection(index);
    }
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (Math.abs(e.touches[0].clientY - touchStartY.current) > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const deltaY = touchStartY.current - touchEndY;
      const deltaX = touchStartX.current - touchEndX;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        if (deltaY > 0 && currentSection < 4) {
          scrollToSection(currentSection + 1);
        } else if (deltaY < 0 && currentSection > 0) {
          scrollToSection(currentSection - 1);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [currentSection]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();

        if (!scrollContainerRef.current) return;

        scrollContainerRef.current.scrollBy({
          left: e.deltaY,
          behavior: 'instant',
        });

        const sectionWidth = scrollContainerRef.current.offsetWidth;
        const newSection = Math.round(scrollContainerRef.current.scrollLeft / sectionWidth);
        if (newSection !== currentSection) {
          setCurrentSection(newSection);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [currentSection]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollThrottleRef.current) return;

      scrollThrottleRef.current = requestAnimationFrame(() => {
        if (!scrollContainerRef.current) {
          scrollThrottleRef.current = undefined;
          return;
        }

        const sectionWidth = scrollContainerRef.current.offsetWidth;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const newSection = Math.round(scrollLeft / sectionWidth);

        if (newSection !== currentSection && newSection >= 0 && newSection <= 4) {
          setCurrentSection(newSection);
        }

        scrollThrottleRef.current = undefined;
      });
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (scrollThrottleRef.current) {
        cancelAnimationFrame(scrollThrottleRef.current);
      }
    };
  }, [currentSection]);

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-gray-900">
      <CustomCursor />
      <GrainOverlay />

      {/* Shader Background */}
      <div
        ref={shaderContainerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ contain: 'strict' }}
      >
        <Shader className="h-full w-full">
          <Swirl
            colorA="#1275d8"
            colorB="#e19136"
            speed={0.8}
            detail={0.8}
            blend={50}
            coarseX={40}
            coarseY={40}
            mediumX={40}
            mediumY={40}
            fineX={40}
            fineY={40}
          />
          <ChromaFlow
            baseColor="#0066ff"
            upColor="#0066ff"
            downColor="#d1d1d1"
            leftColor="#e19136"
            rightColor="#e19136"
            intensity={0.9}
            radius={1.8}
            momentum={25}
            maskType="alpha"
            opacity={0.97}
          />
        </Shader>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Navigation */}
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
            <span className="font-sans text-xl font-bold text-white">A</span>
          </div>
          <span className="font-sans text-xl font-semibold tracking-tight text-white">AI Agent</span>
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item, index) => (
            <button
              key={item}
              onClick={() => scrollToSection(index)}
              className={`group relative font-sans text-sm font-medium transition-colors ${
                currentSection === index ? 'text-white' : 'text-white/80 hover:text-white'
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

        <div className="flex items-center gap-6">
          <button
            onClick={toggleLanguage}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 font-mono text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            {currentLang === 'ru' ? 'EN' : 'RU'}
          </button>
          <div className="h-6 w-px shrink-0 bg-white/20" />
          <MagneticButton variant="secondary" onClick={handleGetStarted}>
            {t('landing.buttons.login')}
          </MagneticButton>
        </div>
      </nav>

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        data-scroll-container
        className={`relative z-10 flex h-screen overflow-x-auto overflow-y-hidden transition-opacity duration-700 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Hero Section */}
        <section className="flex min-h-screen w-screen shrink-0 flex-col justify-end px-6 pb-16 pt-24 md:px-12 md:pb-24">
          <div className="max-w-3xl">
            <div className="mb-4 inline-block animate-fadeInUp rounded-full border border-white/20 bg-white/15 px-4 py-1.5 backdrop-blur-md">
              <p className="font-mono text-xs text-white/90">{t('landing.hero.badge')}</p>
            </div>
            <h1 className="mb-6 animate-fadeInUp font-sans text-6xl font-light leading-[1.1] tracking-tight text-white md:text-7xl lg:text-8xl" style={{ animationDelay: '100ms' }}>
              <span className="text-balance whitespace-pre-line">
                {t('landing.hero.title')}
              </span>
            </h1>
            <p className="mb-8 max-w-xl animate-fadeInUp text-lg leading-relaxed text-white/90 md:text-xl" style={{ animationDelay: '200ms' }}>
              <span className="text-pretty">
                {t('landing.hero.description')}
              </span>
            </p>
            <div className="flex animate-fadeInUp flex-col gap-4 sm:flex-row sm:items-center" style={{ animationDelay: '300ms' }}>
              <MagneticButton size="lg" variant="primary" onClick={handleGetStarted}>
                {t('landing.buttons.getStarted')}
              </MagneticButton>
              <MagneticButton size="lg" variant="secondary" onClick={() => scrollToSection(2)}>
                {t('landing.buttons.learnMore')}
              </MagneticButton>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fadeInUp" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-white/80">{t('landing.hero.scrollHint')}</p>
              <div className="flex h-6 w-12 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur-md">
                <div className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
              </div>
            </div>
          </div>
        </section>

        <WorkSection />
        <ServicesSection />
        <AboutSection scrollToSection={scrollToSection} />
        <ContactSection />
      </div>

      {/* Hide scrollbar */}
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}

export default Landing;
