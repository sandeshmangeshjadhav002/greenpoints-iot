import { useState } from 'react'
import { Mail, Phone, MapPin, Send, Twitter, Instagram, Linkedin, Github, CheckCircle2 } from 'lucide-react'
import Card from '../components/Card'
import Button from '../components/Button'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="section">
      <div className="mb-12 text-center">
        <span className="eyebrow">Contact</span>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Get in touch</h1>
        <p className="mx-auto mt-4 max-w-xl text-leaf-700/70 dark:text-leaf-200/60">
          Questions about deploying smart bins in your neighborhood, or partnering with EcoLoop? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-3">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 size={48} className="mb-3 text-leaf-500" />
              <h3 className="font-display text-lg font-semibold">Message sent!</h3>
              <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">
                This is a frontend-only demo — no message was actually sent.
              </p>
              <Button variant="secondary" className="mt-5" onClick={() => setSubmitted(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Full name</label>
                  <input required type="text" placeholder="Your name" className="w-full rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-4 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <input required type="email" placeholder="you@example.com" className="w-full rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-4 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Subject</label>
                <input required type="text" placeholder="Smart bin deployment inquiry" className="w-full rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-4 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Message</label>
                <textarea required rows={5} placeholder="Tell us a bit about what you need..." className="w-full rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-4 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20" />
              </div>
              <Button className="w-full sm:w-auto">
                <Send size={16} /> Send Message
              </Button>
            </form>
          )}
        </Card>

        {/* Info + Map */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf-100 dark:bg-leaf-900 text-leaf-600 dark:text-mint-400"><Mail size={16} /></span>
                hello@ecoloop.app
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf-100 dark:bg-leaf-900 text-leaf-600 dark:text-mint-400"><Phone size={16} /></span>
                +91 22 4567 8900
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf-100 dark:bg-leaf-900 text-leaf-600 dark:text-mint-400"><MapPin size={16} /></span>
                BKC, Mumbai, Maharashtra, India
              </div>
            </div>
            <div className="my-5 h-px bg-leaf-200 dark:bg-leaf-800" />
            <p className="mb-3 text-sm font-medium">Follow us</p>
            <div className="flex gap-3">
              {[Twitter, Instagram, Linkedin, Github].map((Icon, i) => (
                <a key={i} href="#" className="rounded-full border border-leaf-200 dark:border-leaf-800 p-2 text-leaf-600 dark:text-leaf-200 transition-colors hover:bg-leaf-500 hover:text-white">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </Card>

          <Card className="flex h-56 flex-col items-center justify-center gap-2 overflow-hidden !p-0" hover={false}>
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-leaf-100 to-sky-100 dark:from-leaf-900 dark:to-leaf-950 text-center">
              <MapPin size={28} className="mb-2 text-leaf-500" />
              <p className="text-sm font-medium">Map placeholder</p>
              <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">Google Maps embed goes here</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
