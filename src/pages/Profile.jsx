import { useState, useEffect, useCallback } from 'react'
import { Mail, Phone, MapPin, Calendar, Coins, Recycle, Leaf, Flame,
  Award, Sparkles, Cpu, Users, Trophy, Camera, UserCircle } from 'lucide-react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { RadialProgress } from '../components/ProgressBar'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const badgeIconMap = { Sparkles, Flame, Award, Cpu, Users, Trophy }

function Toggle({ initial }) {
  const [on, setOn] = useState(initial)
  return (
    <button
      onClick={() => setOn((o) => !o)}
      className={classNames(
        'relative shrink-0 h-6 w-11 rounded-full transition-colors duration-300',
        on ? 'bg-gradient-to-r from-leaf-500 to-sky-500' : 'bg-leaf-200 dark:bg-leaf-800',
      )}
      aria-pressed={on}
    >
      <span className={classNames(
        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300',
        on ? 'translate-x-5' : 'translate-x-0.5',
      )} />
    </button>
  )
}

const SETTINGS = [
  {
    title: 'Notifications',
    items: [
      { label: 'Bin full alerts',          enabled: true },
      { label: 'Token earned alerts',      enabled: true },
      { label: 'Weekly summary email',     enabled: false },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { label: 'Show me on leaderboard',   enabled: true },
      { label: 'Share recycling stats',    enabled: false },
    ],
  },
]

export default function Profile() {
  const { apiFetch } = useAuth()
  const [profile, setProfile]   = useState(null)
  const [badges,  setBadges]    = useState([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        apiFetch('/api/users/me'),
        apiFetch('/api/dashboard/badges'),
      ])
      setProfile(pRes.data)
      setBadges(bRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <Breadcrumb items={[{ label: 'Profile' }]} />
        <EmptyState icon={UserCircle} title="Loading profile…" description="Fetching your profile data." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-6xl">
        <Breadcrumb items={[{ label: 'Profile' }]} />
        <EmptyState icon={UserCircle} title="No profile data" description="Sign in to view your profile and recycling progress." />
      </div>
    )
  }

  const joinDate = profile.joinDate
    ? new Date(profile.joinDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'Unknown'

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumb items={[{ label: 'Profile' }]} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: identity card */}
        <Card className="flex flex-col items-center text-center lg:col-span-1">
          <div className="relative">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.display_name} className="h-24 w-24 rounded-2xl ring-4 ring-leaf-100 dark:ring-leaf-900" />
              : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white ring-4 ring-leaf-100 dark:ring-leaf-900"><UserCircle size={48} /></div>
            }
            <button className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-lg">
              <Camera size={14} />
            </button>
          </div>
          <h1 className="mt-4 font-display text-xl font-bold">{profile.display_name || profile.email?.split('@')[0]}</h1>
          {profile.level && <Badge variant="leaf" className="mt-2">{profile.level}</Badge>}

          <div className="mt-6 w-full space-y-3 text-left text-sm">
            {profile.email && (
              <div className="flex items-center gap-2 text-leaf-700/70 dark:text-leaf-200/60">
                <Mail size={15} /> {profile.email}
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2 text-leaf-700/70 dark:text-leaf-200/60">
                <Phone size={15} /> {profile.phone}
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-2 text-leaf-700/70 dark:text-leaf-200/60">
                <MapPin size={15} /> {profile.location}
              </div>
            )}
            <div className="flex items-center gap-2 text-leaf-700/70 dark:text-leaf-200/60">
              <Calendar size={15} /> Joined {joinDate}
            </div>
          </div>

          <button className="btn-primary mt-6 w-full text-sm">Edit Profile</button>
        </Card>

        {/* Right: stats + achievements + settings */}
        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Coins,   label: 'Tokens',    value: (profile.token_balance ?? 0).toLocaleString() },
              { icon: Recycle, label: 'Waste (kg)', value: profile.total_waste_kg ?? 0 },
              { icon: Leaf,    label: 'CO₂ Saved',  value: `${profile.co2_saved_kg ?? 0}kg` },
              { icon: Flame,   label: 'Streak',     value: `${profile.streak_days ?? 0}d` },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <s.icon size={18} className="mx-auto mb-2 text-leaf-500" />
                <p className="font-display text-lg font-bold">{s.value}</p>
                <p className="text-[11px] text-leaf-700/60 dark:text-leaf-200/50">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <RadialProgress
                value={profile.level_progress ?? 0}
                label={`${profile.level_progress ?? 0}%`}
                sublabel="to next level"
                colorClass="text-sky-500"
              />
              <div>
                <p className="font-display font-semibold">Recycling Statistics</p>
                <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">
                  You've recycled{' '}
                  <span className="font-semibold text-leaf-600 dark:text-mint-400">{profile.total_waste_kg ?? 0}kg</span>{' '}
                  since joining, with {profile.disposal_count ?? 0} recorded disposals.
                </p>
                {profile.rank && (
                  <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">
                    City rank: <span className="font-semibold">#{profile.rank}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Badges */}
          {badges.length > 0 && (
            <Card>
              <p className="mb-4 font-display text-sm font-semibold">Achievements</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {badges.map((b) => {
                  const Icon = badgeIconMap[b.icon] || Award
                  return (
                    <div
                      key={b.id}
                      title={b.desc}
                      className={classNames(
                        'flex flex-col items-center gap-1.5 rounded-xl p-3 text-center',
                        b.earned
                          ? 'bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-lg'
                          : 'bg-leaf-100 text-leaf-400 dark:bg-leaf-900 dark:text-leaf-700',
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-[10px] font-medium leading-tight">{b.name}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Settings */}
          {SETTINGS.map((group) => (
            <Card key={group.title}>
              <p className="mb-4 font-display text-sm font-semibold">{group.title}</p>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 text-sm">{item.label}</span>
                    <Toggle initial={item.enabled} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
