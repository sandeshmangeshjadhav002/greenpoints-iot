import { Target, Eye, ListChecks, Cpu, Leaf, Server, Wifi as WifiIcon, Smartphone } from 'lucide-react'
import Card from '../components/Card'
import { teamMembers } from '../data/history'

const objectives = [
  'Deploy IoT-enabled smart bins across dense urban neighborhoods.',
  'Reward verified recycling behavior with a transparent token economy.',
  'Give municipalities real-time visibility into collection routes and bin health.',
  'Cut landfill overflow by predicting fill levels before bins overflow.',
]

const techStack = [
  { icon: Cpu, name: 'ESP32 Microcontrollers', desc: 'Bin-side sensor hubs for fill, weight, and connectivity.' },
  { icon: Server, name: 'Node.js Backend', desc: 'Planned API layer for auth, token ledger, and bin telemetry.' },
  { icon: WifiIcon, name: 'MQTT / Wi-Fi', desc: 'Low-latency bin-to-cloud communication protocol.' },
  { icon: Smartphone, name: 'React + Tailwind', desc: 'This responsive frontend, ready to consume live data.' },
]

const goals = [
  { stat: '40%', label: 'Landfill reduction target by 2027' },
  { stat: '500+', label: 'Smart bins planned across 6 cities' },
  { stat: '1M kg', label: 'Waste diversion goal this year' },
]

export default function About() {
  return (
    <div>
      <section className="section pb-10 text-center">
        <span className="eyebrow">About EcoLoop</span>
        <h1 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Closing the loop between waste and reward
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-leaf-700/70 dark:text-leaf-200/60">
          EcoLoop is a smart waste management platform that pairs IoT-enabled bins with a token-based
          reward system, making sustainable behavior visible, verifiable, and worth it.
        </p>
      </section>

      <section className="section grid grid-cols-1 gap-6 py-10 md:grid-cols-2">
        <Card>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white">
            <Target size={20} />
          </div>
          <h3 className="font-display text-lg font-semibold">Our Mission</h3>
          <p className="mt-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">
            To make recycling a rewarding, transparent habit by connecting every deposit in a smart bin
            to measurable environmental impact and real incentives.
          </p>
        </Card>
        <Card>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white">
            <Eye size={20} />
          </div>
          <h3 className="font-display text-lg font-semibold">Our Vision</h3>
          <p className="mt-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">
            A future where every neighborhood bin is smart, every recycler is rewarded, and cities make
            waste decisions backed by live data instead of guesswork.
          </p>
        </Card>
      </section>

      <section className="section py-10">
        <div className="mb-8 flex items-center gap-3">
          <ListChecks size={22} className="text-leaf-500" />
          <h2 className="font-display text-2xl font-bold">Objectives</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {objectives.map((o, i) => (
            <Card key={i} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf-100 dark:bg-leaf-900 font-mono text-xs font-bold text-leaf-600 dark:text-mint-400">
                {i + 1}
              </span>
              <p className="text-sm text-leaf-700/80 dark:text-leaf-200/70">{o}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section py-10">
        <div className="mb-8 text-center">
          <span className="eyebrow">Team</span>
          <h2 className="mt-3 font-display text-2xl font-bold">The people behind EcoLoop</h2>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {teamMembers.map((m) => (
            <Card key={m.name} className="text-center">
              <img src={m.avatar} alt={m.name} className="mx-auto h-16 w-16 rounded-full ring-4 ring-leaf-100 dark:ring-leaf-900" />
              <p className="mt-3 font-display text-sm font-semibold">{m.name}</p>
              <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">{m.role}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section py-10">
        <div className="mb-8 text-center">
          <span className="eyebrow">Under the Hood</span>
          <h2 className="mt-3 font-display text-2xl font-bold">Technologies used</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {techStack.map((t) => (
            <Card key={t.name}>
              <t.icon size={22} className="mb-3 text-leaf-500" />
              <p className="font-display font-semibold">{t.name}</p>
              <p className="mt-1 text-xs text-leaf-700/60 dark:text-leaf-200/50">{t.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section pb-24 pt-10">
        <div className="glass rounded-3xl p-8 sm:p-12">
          <div className="mb-8 flex items-center gap-3">
            <Leaf size={22} className="text-leaf-500" />
            <h2 className="font-display text-2xl font-bold">Sustainability Goals</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {goals.map((g) => (
              <div key={g.label} className="text-center">
                <p className="font-display text-4xl font-bold bg-gradient-to-r from-leaf-500 to-sky-500 bg-clip-text text-transparent">{g.stat}</p>
                <p className="mt-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
