import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Recycle, Wifi, Coins, Leaf, ArrowRight, ScanLine, Trophy,
  Cpu, ShieldCheck, TrendingUp, ChevronDown, Quote, Sparkles,
} from 'lucide-react'
import { useInView } from '../hooks/useInView'
import AnimatedCounter from '../components/AnimatedCounter'
import Card from '../components/Card'
import { testimonials, faqs } from '../data/history'
import { stats } from '../data/analytics'

function Reveal({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'in-view' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

const features = [
  { icon: ScanLine, title: 'Smart Bin Sensors', desc: 'Ultrasonic fill sensors and cameras classify and measure waste in real time.' },
  { icon: Coins, title: 'Reward Tokens', desc: 'Every kilogram recycled converts into tokens you can redeem for real rewards.' },
  { icon: Wifi, title: 'Live Monitoring', desc: 'Track fill levels, battery, and bin health from anywhere, instantly.' },
  { icon: Trophy, title: 'Community Leaderboard', desc: 'Compete with your neighborhood and climb the weekly rankings.' },
  { icon: TrendingUp, title: 'Impact Analytics', desc: 'Visualize your carbon savings and recycling trends over time.' },
  { icon: ShieldCheck, title: 'Verified Accuracy', desc: 'Dual-sensor validation keeps every token backed by real recycled waste.' },
]

const steps = [
  { title: 'Drop your waste', desc: 'Deposit sorted waste into any registered EcoLoop smart bin near you.' },
  { title: 'Sensors verify it', desc: 'Weight and vision sensors confirm category and quantity automatically.' },
  { title: 'Earn tokens', desc: 'Tokens are credited to your account the moment the bin confirms your drop.' },
  { title: 'Redeem rewards', desc: 'Exchange tokens for products, vouchers, or real environmental impact.' },
]

const benefits = [
  { icon: Leaf, title: 'Cleaner Neighborhoods', desc: 'Fewer overflowing bins thanks to predictive fill-level alerts.' },
  { icon: Cpu, title: 'Hardware Ready', desc: 'Designed to connect directly to ESP32-based bin controllers.' },
  { icon: Sparkles, title: 'Gamified Habits', desc: 'Streaks, badges, and leaderboards make recycling genuinely fun.' },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:px-10 lg:py-28">
          <div className="animate-fadeUp">
            <span className="eyebrow">Smart Waste × Reward Tokens</span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Recycle smarter.
              <br />
              <span className="bg-gradient-to-r from-leaf-500 to-sky-500 bg-clip-text text-transparent">
                Earn real rewards.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-leaf-700/80 dark:text-leaf-200/70">
              EcoLoop connects IoT-enabled smart bins with a token economy — every drop is measured,
              verified, and turned into rewards for you and your community.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/dashboard" className="btn-primary">
                Launch Dashboard <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="btn-secondary">
                See How It Works
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div>
                <p className="font-display text-2xl font-bold"><AnimatedCounter value={stats.totalUsers} /></p>
                <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">Active recyclers</p>
              </div>
              <div className="h-8 w-px bg-leaf-200 dark:bg-leaf-800" />
              <div>
                <p className="font-display text-2xl font-bold"><AnimatedCounter value={stats.totalBins} /></p>
                <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">Smart bins live</p>
              </div>
              <div className="h-8 w-px bg-leaf-200 dark:bg-leaf-800" />
              <div>
                <p className="font-display text-2xl font-bold"><AnimatedCounter value={stats.co2SavedTons} decimals={1} suffix="t" /></p>
                <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">CO₂ saved</p>
              </div>
            </div>
          </div>

          {/* Animated illustration */}
          <div className="relative mx-auto flex h-96 w-full max-w-md items-center justify-center">
            <div className="absolute h-72 w-72 animate-pulse-ring rounded-full bg-leaf-400/30" />
            <div className="glass relative flex h-64 w-64 animate-float items-center justify-center rounded-[2.5rem] shadow-glow">
              <Recycle size={88} className="text-leaf-500" strokeWidth={1.5} />
              <span className="absolute -top-4 -right-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-leaf-900 shadow-glass animate-float" style={{ animationDelay: '1s' }}>
                <Coins size={26} className="text-sky-500" />
              </span>
              <span className="absolute -bottom-5 -left-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-leaf-900 shadow-glass animate-float" style={{ animationDelay: '2s' }}>
                <Wifi size={26} className="text-leaf-500" />
              </span>
              <span className="absolute top-10 -left-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-glow animate-spin-slow">
                <Sparkles size={18} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Features</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to close the loop
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <Card className="h-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-lg">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">{f.desc}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="section">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Process</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            From bin to reward, in four steps
          </h2>
        </Reveal>
        <div className="relative mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-leaf-300 via-sky-400 to-leaf-300 dark:from-leaf-700 dark:via-sky-700 dark:to-leaf-700 lg:block" />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-leaf-950 font-display text-lg font-bold text-leaf-600 dark:text-mint-400 shadow-glass ring-4 ring-leaf-50 dark:ring-leaf-950">
                {i + 1}
              </div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">{s.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="section">
        <div className="glass grid grid-cols-1 gap-10 rounded-3xl p-8 sm:p-12 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">Benefits</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Built for cities, ready for hardware
            </h2>
            <p className="mt-4 text-leaf-700/70 dark:text-leaf-200/60">
              EcoLoop's frontend is engineered to plug directly into a Node.js backend and ESP32-powered
              smart bins, so what you see here is production-ready from day one.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 100} className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf-100 dark:bg-leaf-900 text-leaf-600 dark:text-mint-400">
                  <b.icon size={18} />
                </div>
                <div>
                  <h4 className="font-display font-semibold">{b.title}</h4>
                  <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Recyclers', value: stats.totalUsers, suffix: '+' },
            { label: 'Smart Bins', value: stats.totalBins },
            { label: 'Waste Collected', value: stats.totalWasteTons, decimals: 1, suffix: 't' },
            { label: 'Tokens Issued', value: stats.totalTokensIssued },
            { label: 'CO₂ Saved', value: stats.co2SavedTons, decimals: 1, suffix: 't' },
            { label: 'Cities', value: stats.activeCities },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 60} className="text-center">
              <p className="font-display text-3xl font-bold text-leaf-600 dark:text-mint-400 sm:text-4xl">
                <AnimatedCounter value={s.value} decimals={s.decimals || 0} suffix={s.suffix || ''} />
              </p>
              <p className="mt-1 text-xs text-leaf-700/60 dark:text-leaf-200/50 sm:text-sm">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Testimonials</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by early communities
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={i * 100}>
              <Card className="flex h-full flex-col">
                <Quote className="mb-3 text-leaf-400" size={24} />
                <p className="flex-1 text-sm text-leaf-800/80 dark:text-leaf-100/80">{t.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">{t.role}</p>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">FAQ</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </Reveal>
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <div className="glass overflow-hidden rounded-2xl">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-medium"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                >
                  {f.q}
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-leaf-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className="grid transition-all duration-300"
                  style={{ gridTemplateRows: openFaq === i ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-leaf-700/70 dark:text-leaf-200/60">{f.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-leaf-600 via-leaf-500 to-sky-500 px-8 py-16 text-center text-white sm:py-20">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to turn recycling into rewards?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/85">
            Join thousands of recyclers already tracking their impact and redeeming real rewards on EcoLoop.
          </p>
          <Link to="/dashboard" className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-display font-semibold text-leaf-700 shadow-lg transition-transform hover:scale-105">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>
    </div>
  )
}
