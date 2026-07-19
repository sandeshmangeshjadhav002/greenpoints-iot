export const currentUser = {
  id: 'usr_1024',
  name: 'Aditi Rao',
  email: 'aditi.rao@ecoloop.app',
  phone: '+91 98765 43210',
  avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Aditi',
  location: 'Mumbai, Maharashtra',
  joinDate: '2024-11-02',
  tokens: 3260,
  level: 'Gold Recycler',
  levelProgress: 68,
  nextLevel: 'Platinum Recycler',
  streakDays: 14,
  totalWasteKg: 482.6,
  co2SavedKg: 216.4,
  rank: 3,
}

export const settingsGroups = [
  {
    title: 'Account',
    items: [
      { label: 'Email notifications', enabled: true },
      { label: 'SMS alerts for bin pickups', enabled: true },
      { label: 'Weekly impact summary', enabled: false },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { label: 'Show my profile on leaderboard', enabled: true },
      { label: 'Share anonymized data for research', enabled: true },
    ],
  },
  {
    title: 'App Preferences',
    items: [
      { label: 'Dark mode by default', enabled: false },
      { label: 'Push notifications', enabled: true },
    ],
  },
]
