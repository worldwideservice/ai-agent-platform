import { useTranslation } from 'react-i18next';
import { useReveal } from '../../src/hooks/useReveal';

export function WorkSection() {
  const { t } = useTranslation();
  const { ref, isVisible } = useReveal(0.3);

  const projects = [
    {
      number: '01',
      title: t('landing.work.items.agents.title'),
      category: t('landing.work.items.agents.category'),
      year: 'GPT-4o / Claude',
      direction: 'left',
    },
    {
      number: '02',
      title: t('landing.work.items.knowledge.title'),
      category: t('landing.work.items.knowledge.category'),
      year: 'RAG Search',
      direction: 'right',
    },
    {
      number: '03',
      title: t('landing.work.items.crm.title'),
      category: t('landing.work.items.crm.category'),
      year: 'Webhooks',
      direction: 'left',
    },
  ];

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="flex h-screen w-screen shrink-0 snap-start items-center px-6 pt-20 md:px-12 md:pt-0 lg:px-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div
          className={`mb-12 transition-all duration-700 md:mb-16 ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'
          }`}
        >
          <h2 className="mb-2 font-sans text-5xl font-light tracking-tight text-white md:text-6xl lg:text-7xl">
            {t('landing.work.title')}
          </h2>
          <p className="font-mono text-sm text-white/60 md:text-base">{t('landing.work.subtitle')}</p>
        </div>

        <div className="space-y-6 md:space-y-8">
          {projects.map((project, i) => (
            <ProjectCard key={i} project={project} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  index,
  isVisible,
}: {
  project: { number: string; title: string; category: string; year: string; direction: string };
  index: number;
  isVisible: boolean;
}) {
  const getRevealClass = () => {
    if (!isVisible) {
      return project.direction === 'left' ? '-translate-x-16 opacity-0' : 'translate-x-16 opacity-0';
    }
    return 'translate-x-0 opacity-100';
  };

  return (
    <div
      className={`group flex items-center justify-between border-b border-white/10 py-6 transition-all duration-700 hover:border-white/20 md:py-8 ${getRevealClass()}`}
      style={{
        transitionDelay: `${index * 150}ms`,
        marginLeft: index % 2 === 0 ? '0' : 'auto',
        maxWidth: index % 2 === 0 ? '85%' : '90%',
      }}
    >
      <div className="flex items-baseline gap-4 md:gap-8">
        <span className="font-mono text-sm text-white/30 transition-colors group-hover:text-white/50 md:text-base">
          {project.number}
        </span>
        <div>
          <h3 className="mb-1 font-sans text-2xl font-light text-white transition-transform duration-300 group-hover:translate-x-2 md:text-3xl lg:text-4xl">
            {project.title}
          </h3>
          <p className="font-mono text-xs text-white/50 md:text-sm">{project.category}</p>
        </div>
      </div>
      <span className="font-mono text-xs text-white/30 md:text-sm">{project.year}</span>
    </div>
  );
}
