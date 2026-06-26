"use client";

import { motion, Variants } from 'framer-motion';
import Header from '@/components/Header';
import TripPreviewWidget from '@/components/TripPreviewWidget';
import Link from 'next/link';

// Reusable animation variants
const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const fadeRightVariant: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const fadeLeftVariant: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container">
      {/* Skip to main content for screen readers */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      
      {/* Top Navigation */}
      <Header />

      <main id="main-content" className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="px-6 lg:px-12 xl:px-20 pt-12 pb-32 max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 xl:gap-16 2xl:gap-20 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-left space-y-6"
            >
              <motion.h1 variants={fadeUpVariant} className="font-display text-display lg:text-[64px] lg:leading-[1.1] text-on-surface tracking-tight font-bold">
                Travel planning,<br className="hidden lg:block"/> simplified.
              </motion.h1>
              <motion.p variants={fadeUpVariant} className="font-body-lg text-body-lg text-secondary max-w-lg leading-relaxed">
                The minimalist&apos;s way to organize trips, discover gems, and build itineraries that flow without the noise.
              </motion.p>
              <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="px-8 py-3 bg-primary-container text-on-primary-container rounded-lg font-headline-md font-semibold text-center shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  Get Started Free
                </Link>
                <a
                  href="#how-it-works"
                  className="px-8 py-3 bg-surface-container-low text-on-surface rounded-lg font-headline-md font-semibold text-center border border-surface-container hover:bg-surface-container transition-all"
                >
                  View Demo
                </a>
              </motion.div>
              
              <motion.div variants={fadeUpVariant} className="mt-6 flex items-center gap-2 pt-4" aria-label="User statistics">
                <div className="flex -space-x-2" role="presentation">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-secondary-container" aria-hidden="true"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-container" aria-hidden="true"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-highest" aria-hidden="true"></div>
                </div>
                <span className="text-label-sm text-secondary font-medium">Joined by 15k+ travelers</span>
              </motion.div>
            </motion.div>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={fadeLeftVariant}
              className="relative mt-12 md:mt-0"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-surface-container">
                { }
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  alt="Minimalist train station platform showcasing travel planning inspiration"
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                  width="800"
                  height="600"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2sj3rgYgs2-IcKAcCUn8UuXfq4zrfIReWEbeIqaohNn45VKENtyYZURzTjwM5E9NLRGm1S8KsNpqI6gDjlW3dvoVvs5XeBNpTjrIvwZsvz8yNut3I5AfjxhH0YSdmZo1rt4YDW0fKP-nMgp8nrnSBN5Yzlz7PAR1nFffSclF-0MHe_7SFqZBWSgeOAKkoMZ9s0K3IU-OPTfq5Tkm30hVW2X0lgmXD3yBut_HdvAUxBrmtKPRRVUkG7IQa6AzwAUgbZUOywzp8jO9z"
                />
              </div>
              {/* Floating tag */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-surface-container hidden lg:block animate-bounce-slow" 
                aria-label="Saved trip example"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">
                    push_pin
                  </span>
                  <span className="font-label-md text-on-surface font-semibold">Saved: Kyoto Coffee Tour</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Narrative Section: Features */}
        <section className="px-6 lg:px-12 xl:px-20 py-32 bg-surface-container-lowest border-y border-surface-container" id="features">
          <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUpVariant}
              className="text-center mb-24"
            >
              <span className="font-label-sm text-primary uppercase tracking-[0.2em] mb-2 block font-semibold">
                Core Philosophy
              </span>
              <h2 className="font-display text-[40px] text-on-surface font-bold mb-4">
                From Spark to Sunset
              </h2>
              <p className="text-secondary font-body-lg max-w-2xl mx-auto leading-relaxed">
                Everything you need to design your perfect getaway, from the first thought to the final destination.
              </p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid lg:grid-cols-3 gap-6 xl:gap-8 2xl:gap-10"
            >
              {/* Feature 1 */}
              <motion.article 
                variants={fadeUpVariant}
                className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-surface-container shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-14 h-14 rounded-2xl border border-surface-container flex items-center justify-center bg-white group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">
                    auto_awesome
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-on-surface font-semibold mb-2 text-lg">
                    Capture Inspiration
                  </h3>
                  <p className="font-body-md text-secondary mb-6 leading-relaxed">
                    Save hidden spots, cafes, and sights from any social feed or map directly into your personal travel inbox.
                  </p>
                  <div className="rounded-xl border border-surface-container overflow-hidden aspect-[4/3] bg-surface-container-low group-hover:shadow-sm transition-shadow">
                    { }
                    <motion.img
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      alt="Minimalist travel inspiration feed user interface"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width="400"
                      height="300"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCAYPPLK0hsr-bzJCTam53qRxlDhaFOlIfnVbJvKiVVAdRwfLEPVS_d51cHHOsIJZMcNIc_x7kATT4AL1s_6pUOHX7IupqW0TGwPitJzkbOIVGkRgSKrrgpCyRj4bpJZbQEUJK0PEpNIVxm8HqCFZC8ELuiDrGTq5BtQkpnNvx3RNVk83UBwHjXRQdM-5a9hTA7G3pHASY1caxOddJ_UrIJCQIEkCLeKZlxpgdaUOxwe3blhzIfuyElZl4NTZNtGFzlYRcEyZYmtRg"
                    />
                  </div>
                </div>
              </motion.article>

              {/* Feature 2 */}
              <motion.article 
                variants={fadeUpVariant}
                className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-surface-container shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-14 h-14 rounded-2xl border border-surface-container flex items-center justify-center bg-white group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">
                    drag_indicator
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-on-surface font-semibold mb-2 text-lg">
                    Organize with Ease
                  </h3>
                  <p className="font-body-md text-secondary mb-6 leading-relaxed">
                    A distraction-free, drag-and-drop itinerary that builds itself as you add destinations and experiences.
                  </p>
                  <div className="rounded-xl border border-surface-container overflow-hidden aspect-[4/3] bg-surface-container-low group-hover:shadow-sm transition-shadow">
                    { }
                    <motion.img
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      alt="Clean drag-and-drop travel itinerary interface"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width="400"
                      height="300"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNJEtj3-6fkDZC2VLJBZk2NkJkrA-I6YurrXjSWAM2bJN1SZsIsVdlSsHIo5dUb-4F8vMSsU2iGb4HEM_ZxoGI3RMGV6qE2usY3W0SsgyENR38kdmbHkNT2qf4u8cDS2fBSlZJhnNEOQGoP79u8Z_Ymn-JpAQ_g6JoAxUA-MZwcmrddeDlyQSsINGinXmzs7RAOB5ewUHMNjZ5dQaufPrifxY0ffxeRg1IWId_bPjAjL-e-s6NqYBppS9MYtz-Edpz_xaPXz5sX-L4"
                    />
                  </div>
                </div>
              </motion.article>

              {/* Feature 3 */}
              <motion.article 
                variants={fadeUpVariant}
                className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-surface-container shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-14 h-14 rounded-2xl border border-surface-container flex items-center justify-center bg-white group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">
                    group
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-on-surface font-semibold mb-2 text-lg">
                    Travel Together
                  </h3>
                  <p className="font-body-md text-secondary mb-6 leading-relaxed">
                    Invite friends to contribute and view the plan in real-time. Say goodbye to messy group chat threads.
                  </p>
                  <div className="rounded-xl border border-surface-container overflow-hidden aspect-[4/3] bg-surface-container-low group-hover:shadow-sm transition-shadow">
                    { }
                    <motion.img
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      alt="Real-time collaboration interface for group travel planning"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width="400"
                      height="300"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5hGqS6zlIYYHA2PaWhZU1iEEGtDPiZxSLf9kZ3JkngjcagrcPW41SV4PlGP8xz2C6sicoPv5Wc90qI8fzd6zVcOzLOX_6IypA6A7og-XUf3Q4XaomaqcszTUgXn6Dwdq4MuvXibmlZPR_JsZj5O_vMnpFQ4O4nN4d5j_jZAzLhnDiUlXyr4Ed70MsxjlOS0LGh94OMLAjWqr_-xZ4gcYkq-WnCeJCy4a1Y3IM5BNypcijKSgFUdGNKu20Et3LjFBCDd_IAixED5lK"
                    />
                  </div>
                </div>
              </motion.article>
            </motion.div>
          </div>
        </section>

        {/* Live Demo: Interactive Preview Section */}
        <section className="px-6 lg:px-12 xl:px-20 py-32 bg-surface" id="how-it-works">
          <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto space-y-12">
            <div className="flex flex-col lg:flex-row gap-12 xl:gap-16 items-center">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeRightVariant}
                className="lg:w-1/3 text-left space-y-2"
              >
                <span className="font-label-sm text-primary uppercase tracking-[0.2em] font-semibold">
                  Interactive
                </span>
                <h2 className="font-display text-display text-on-surface font-bold">
                  Trip Preview
                </h2>
                <p className="text-secondary font-body-lg leading-relaxed">
                  Experience the interface. Toggle between days, see details, and watch the itinerary come to life.
                </p>
              </motion.div>
              
              {/* Trip Preview Widget */}
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeLeftVariant}
                className="lg:w-2/3 w-full"
              >
                <TripPreviewWidget />
              </motion.div>
            </div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariant}
              className="text-center pt-4"
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-primary font-label-md text-label-md hover:underline font-semibold group"
              >
                Explore full demo itinerary
                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="px-6 lg:px-12 xl:px-20 py-32 bg-surface border-t border-surface-container" id="pricing">
          <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto text-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUpVariant}
            >
              <span className="font-label-sm text-primary uppercase tracking-[0.2em] mb-2 block font-semibold">
                Pricing Plans
              </span>
              <h2 className="font-display text-[40px] text-on-surface font-bold mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-secondary font-body-lg max-w-2xl mx-auto leading-relaxed">
                Choose the tier that matches your travel frequency. Start for free, upgrade whenever you need.
              </p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 gap-8 xl:gap-10 max-w-5xl xl:max-w-6xl mx-auto mt-16 text-left"
            >
              {/* Hobby Plan */}
              <motion.article 
                variants={fadeUpVariant}
                whileHover={{ y: -8 }}
                className="flex flex-col justify-between p-8 bg-white border border-surface-container rounded-2xl shadow-sm hover:shadow-md transition-all relative"
              >
                <div className="space-y-6">
                  <header>
                    <h3 className="font-display text-xl font-bold text-on-surface">Hobby</h3>
                    <p className="font-body-md text-secondary mt-1">For casual travelers and weekend trips.</p>
                  </header>
                  <div className="flex items-baseline" aria-label="Pricing">
                    <span className="font-display text-4xl font-bold text-on-surface">$0</span>
                    <span className="text-secondary text-sm font-medium ml-2">free forever</span>
                  </div>
                  <div className="border-t border-surface-container pt-6">
                    <ul className="space-y-4" role="list">
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Up to 3 active trip plans</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Visual drag-and-drop timeline</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Basic categories & itinerary tags</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Mobile-responsive access</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="pt-8">
                  <Link
                    href="/login"
                    className="block w-full text-center py-3 border border-surface-container rounded-lg font-headline-md font-semibold text-secondary hover:bg-surface-container-low transition-colors text-sm"
                  >
                    Get Started Free
                  </Link>
                </div>
              </motion.article>

              {/* Pro Plan */}
              <motion.article 
                variants={fadeUpVariant}
                whileHover={{ y: -8 }}
                className="flex flex-col justify-between p-8 bg-white border-2 border-primary rounded-2xl shadow-md hover:shadow-lg transition-all relative"
              >
                <div className="absolute -top-4 right-6 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full" aria-label="Recommended plan">
                  Recommended
                </div>
                <div className="space-y-6">
                  <header>
                    <h3 className="font-display text-xl font-bold text-on-surface">Pro Traveler</h3>
                    <p className="font-body-md text-secondary mt-1">For frequent adventurers seeking full productivity.</p>
                  </header>
                  <div className="flex items-baseline" aria-label="Pricing">
                    <span className="font-display text-4xl font-bold text-on-surface">$8</span>
                    <span className="text-secondary text-sm font-medium ml-2">/ month</span>
                  </div>
                  <div className="border-t border-surface-container pt-6">
                    <ul className="space-y-4" role="list">
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-on-surface font-medium">Unlimited active trip plans</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Real-time collaborative planning</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Offline export (PDF & JSON itineraries)</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Unlimited custom tags & templates</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">check</span>
                        <span className="font-body-md text-secondary">Priority support response (&lt; 24h)</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="pt-8">
                  <Link
                    href="/login"
                    className="block w-full text-center py-3 bg-primary-container text-on-primary-container rounded-lg font-headline-md font-semibold hover:shadow-md transition-all active:scale-95 text-sm"
                  >
                    Go Pro
                  </Link>
                </div>
              </motion.article>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 lg:px-12 xl:px-20 py-32 bg-on-surface text-surface-container-lowest relative overflow-hidden text-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--color-primary),_transparent_70%)]"></div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto space-y-12 relative z-10"
          >
            <motion.h2 variants={fadeUpVariant} className="font-display text-[48px] font-bold tracking-tight mb-4 leading-tight text-white">
              Ready for your next gem?
            </motion.h2>
            <motion.p variants={fadeUpVariant} className="font-body-lg text-body-lg text-white/70 mb-12 max-w-xl mx-auto leading-relaxed">
              Join thousands of travelers who have found peace in the planning process.
            </motion.p>
            <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl font-headline-md font-semibold hover:scale-105 transition-all shadow-md text-center"
              >
                Start Your First Trip
              </Link>
              <Link
                href="/login"
                className="bg-transparent text-white border border-white/30 px-8 py-4 rounded-xl font-headline-md font-semibold hover:bg-white/10 transition-all text-center"
              >
                Contact Sales
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-surface-container">
        <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-6 lg:px-12 xl:px-20 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/logo.svg" 
                  alt="Vyora Logo" 
                  className="w-6 h-6"
                />
                <span className="font-display text-headline-md text-on-surface font-bold">
                  Vyora
                </span>
              </div>
              <p className="text-secondary text-body-md max-w-xs leading-relaxed">
                A minimalist travel companion for those who value the journey as much as the destination.
              </p>
            </div>

            {/* Links Column 1 */}
            <div className="flex flex-col gap-4">
              <h4 className="font-label-sm font-bold text-on-surface uppercase tracking-wider">Product</h4>
              <nav className="flex flex-col gap-2">
                <a href="#features" className="text-secondary hover:text-primary transition-colors text-body-md">Features</a>
                <Link href="/dashboard" className="text-secondary hover:text-primary transition-colors text-body-md">Integrations</Link>
                <a href="#pricing" className="text-secondary hover:text-primary transition-colors text-body-md">Pricing</a>
                <Link href="/dashboard" className="text-secondary hover:text-primary transition-colors text-body-md">Roadmap</Link>
              </nav>
            </div>

            {/* Links Column 2 */}
            <div className="flex flex-col gap-4">
              <h4 className="font-label-sm font-bold text-on-surface uppercase tracking-wider">Resources</h4>
              <nav className="flex flex-col gap-2">
                <Link href="/dashboard" className="text-secondary hover:text-primary transition-colors text-body-md">Guides</Link>
                <Link href="/dashboard" className="text-secondary hover:text-primary transition-colors text-body-md">Help Center</Link>
                <Link href="/dashboard" className="text-secondary hover:text-primary transition-colors text-body-md">Community</Link>
                <Link href="/dashboard" className="text-secondary hover:text-primary transition-colors text-body-md">Travel Blog</Link>
              </nav>
            </div>

            {/* Links Column 3 */}
            <div className="flex flex-col gap-4">
              <h4 className="font-label-sm font-bold text-on-surface uppercase tracking-wider">Social</h4>
              <nav className="flex flex-col gap-2">
                <a href="#" className="text-secondary hover:text-primary transition-colors text-body-md">Twitter</a>
                <a href="#" className="text-secondary hover:text-primary transition-colors text-body-md">Instagram</a>
                <a href="#" className="text-secondary hover:text-primary transition-colors text-body-md">Threads</a>
                <a href="#" className="text-secondary hover:text-primary transition-colors text-body-md">LinkedIn</a>
              </nav>
            </div>
          </div>

          <div className="pt-6 border-t border-surface-container flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-label-sm text-secondary">© 2024 Vyora Inc. All rights reserved.</p>
            <nav className="flex gap-6" aria-label="Legal links">
              <a href="#" className="text-label-sm text-secondary hover:text-on-surface transition-colors">Privacy Policy</a>
              <a href="#" className="text-label-sm text-secondary hover:text-on-surface transition-colors">Terms of Service</a>
              <a href="#" className="text-label-sm text-secondary hover:text-on-surface transition-colors">Cookies</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
