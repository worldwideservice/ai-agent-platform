import { Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReveal } from '../../src/hooks/useReveal';
import { useState, FormEvent } from 'react';
import { MagneticButton } from './MagneticButton';

export function ContactSection() {
  const { t } = useTranslation();
  const { ref, isVisible } = useReveal(0.3);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      return;
    }

    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFormData({ name: '', email: '', message: '' });

    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="flex h-screen w-screen shrink-0 snap-start items-center px-4 pt-20 md:px-12 md:pt-0 lg:px-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-16 lg:gap-24">
          <div className="flex flex-col justify-center">
            <div
              className={`mb-6 transition-all duration-700 md:mb-12 ${
                isVisible ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'
              }`}
            >
              <h2 className="mb-2 font-sans text-4xl font-light leading-[1.05] tracking-tight text-white whitespace-pre-line md:mb-3 md:text-7xl lg:text-8xl">
                {t('landing.contact.title')}
              </h2>
              <p className="font-mono text-xs text-white/60 md:text-base">{t('landing.contact.subtitle')}</p>
            </div>

            <div className="space-y-4 md:space-y-8">
              <a
                href="mailto:hello@ai-agent.io"
                className={`group block transition-all duration-700 ${
                  isVisible ? 'translate-x-0 opacity-100' : '-translate-x-16 opacity-0'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Mail className="h-3 w-3 text-white/60" />
                  <span className="font-mono text-xs text-white/60">Email</span>
                </div>
                <p className="text-base text-white transition-colors group-hover:text-white/70 md:text-2xl">
                  hello@ai-agent.io
                </p>
              </a>

              <div
                className={`transition-all duration-700 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: '350ms' }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-white/60" />
                  <span className="font-mono text-xs text-white/60">{t('landing.contact.location')}</span>
                </div>
                <p className="text-base text-white md:text-2xl">{t('landing.contact.locationValue')}</p>
              </div>

              <div
                className={`flex gap-2 pt-2 transition-all duration-700 md:pt-4 ${
                  isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
                }`}
                style={{ transitionDelay: '500ms' }}
              >
                {['Telegram', 'WhatsApp', 'LinkedIn'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="border-b border-transparent font-mono text-xs text-white/60 transition-all hover:border-white/60 hover:text-white/90"
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div
                className={`transition-all duration-700 ${
                  isVisible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                <label className="mb-1 block font-mono text-xs text-white/60 md:mb-2">{t('landing.contact.form.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full border-b border-white/30 bg-transparent py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none md:py-2 md:text-base"
                  placeholder={t('landing.contact.form.namePlaceholder')}
                />
              </div>

              <div
                className={`transition-all duration-700 ${
                  isVisible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'
                }`}
                style={{ transitionDelay: '350ms' }}
              >
                <label className="mb-1 block font-mono text-xs text-white/60 md:mb-2">{t('landing.contact.form.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full border-b border-white/30 bg-transparent py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none md:py-2 md:text-base"
                  placeholder="your@email.com"
                />
              </div>

              <div
                className={`transition-all duration-700 ${
                  isVisible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'
                }`}
                style={{ transitionDelay: '500ms' }}
              >
                <label className="mb-1 block font-mono text-xs text-white/60 md:mb-2">{t('landing.contact.form.message')}</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  className="w-full resize-none border-b border-white/30 bg-transparent py-1.5 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none md:py-2 md:text-base"
                  placeholder={t('landing.contact.form.messagePlaceholder')}
                />
              </div>

              <div
                className={`transition-all duration-700 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: '650ms' }}
              >
                <MagneticButton
                  variant="primary"
                  size="lg"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? t('landing.contact.form.submitting') : t('landing.contact.form.submit')}
                </MagneticButton>
                {submitSuccess && (
                  <p className="mt-3 text-center font-mono text-sm text-white/80">{t('landing.contact.form.success')}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
