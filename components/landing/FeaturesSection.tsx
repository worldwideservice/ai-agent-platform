import React from 'react';

interface FeaturesSectionProps {
  isVisible: boolean;
}

const features = [
  {
    icon: '🤖',
    title: 'Умные AI Агенты',
    description: 'Настраиваемые ассистенты с продвинутым пониманием контекста и памятью разговоров',
  },
  {
    icon: '⚡',
    title: 'Мгновенные ответы',
    description: 'Отвечайте клиентам 24/7 без задержек и очередей ожидания',
  },
  {
    icon: '🔗',
    title: 'Интеграции',
    description: 'Подключение к Kommo CRM, мессенджерам и вашим бизнес-системам',
  },
  {
    icon: '📊',
    title: 'Аналитика',
    description: 'Детальная статистика разговоров и эффективности агентов',
  },
  {
    icon: '📚',
    title: 'База знаний',
    description: 'Загружайте документы и AI будет использовать их для ответов',
  },
  {
    icon: '🛡️',
    title: 'Безопасность',
    description: 'Шифрование данных и соответствие стандартам безопасности',
  },
];

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ isVisible }) => {
  return (
    <section className="relative flex h-screen w-screen flex-shrink-0 items-center justify-center px-6 md:px-12">
      <div className="max-w-6xl">
        <h2
          className={`mb-4 text-center font-sans text-4xl font-bold text-white transition-all duration-1000 md:text-5xl ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          Возможности платформы
        </h2>
        <p
          className={`mx-auto mb-12 max-w-2xl text-center font-sans text-lg text-white/60 transition-all delay-100 duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          Все инструменты для создания эффективных AI-ассистентов
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-500 hover:border-white/20 hover:bg-white/10 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: isVisible ? `${150 + index * 100}ms` : '0ms' }}
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 font-sans text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="font-sans text-sm text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
