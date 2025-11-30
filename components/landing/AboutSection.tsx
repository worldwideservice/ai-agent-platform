import { useTranslation } from 'react-i18next';
import { useReveal } from '../../src/hooks/useReveal';
import { MagneticButton } from './MagneticButton';

interface AboutSectionProps {
  scrollToSection: (index: number) => void;
}

export function AboutSection({ scrollToSection }: AboutSectionProps) {
  const { t } = useTranslation();
  const { ref, isVisible } = useReveal(0.3);

  const stats = [
    { value: '99%', label: t('landing.about.stats.accuracy') },
    { value: '24/7', label: t('landing.about.stats.uptime') },
    { value: '<1s', label: t('landing.about.stats.response') },
  ];

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="flex h-screen w-screen shrink-0 snap-start items-center px-6 pt-20 md:px-12 md:pt-0 lg:px-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          <div>
            <div
              className={`mb-8 transition-all duration-700 ${
                isVisible ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'
              }`}
            >
              <h2 className="mb-2 font-sans text-5xl font-light tracking-tight text-white md:text-6xl lg:text-7xl">
                {t('landing.about.title')}
              </h2>
              <p className="font-mono text-sm text-white/60 md:text-base">{t('landing.about.subtitle')}</p>
            </div>

            <div
              className={`space-y-6 transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <p className="text-lg leading-relaxed text-white/90 md:text-xl">
                {t('landing.about.description1')}
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                {t('landing.about.description2')}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="space-y-8">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className={`transition-all duration-700 ${
                    isVisible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'
                  }`}
                  style={{ transitionDelay: `${(i + 1) * 150}ms` }}
                >
                  <div className="mb-1 font-sans text-4xl font-light text-white md:text-5xl">{stat.value}</div>
                  <p className="font-mono text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>

            <div
              className={`mt-12 transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              <MagneticButton variant="secondary" size="lg" onClick={() => scrollToSection(4)}>
                {t('landing.buttons.contactUs')}
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
