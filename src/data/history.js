export const recentActivity = [
  { id: 'a1', type: 'Recyclable', kg: 3.2, tokens: 45, bin: 'BIN-4471', date: 'Today, 10:24 AM' },
  { id: 'a2', type: 'Organic', kg: 1.8, tokens: 20, bin: 'BIN-4477', date: 'Yesterday, 6:12 PM' },
  { id: 'a3', type: 'E-Waste', kg: 0.6, tokens: 30, bin: 'BIN-4475', date: 'Yesterday, 11:05 AM' },
  { id: 'a4', type: 'Recyclable', kg: 2.4, tokens: 34, bin: 'BIN-4474', date: '2 days ago' },
  { id: 'a5', type: 'General', kg: 4.1, tokens: 28, bin: 'BIN-4476', date: '3 days ago' },
  { id: 'a6', type: 'Organic', kg: 2.9, tokens: 32, bin: 'BIN-4472', date: '4 days ago' },
]

export const badges = [
  { id: 'b1', name: 'First Drop', icon: 'Sparkles', earned: true, desc: 'Recycled your first item' },
  { id: 'b2', name: '7-Day Streak', icon: 'Flame', earned: true, desc: 'Recycled 7 days in a row' },
  { id: 'b3', name: 'Century Club', icon: 'Award', earned: true, desc: 'Recycled 100kg total' },
  { id: 'b4', name: 'E-Waste Hero', icon: 'Cpu', earned: true, desc: 'Recycled 5kg of e-waste' },
  { id: 'b5', name: 'Community Leader', icon: 'Users', earned: false, desc: 'Refer 10 friends' },
  { id: 'b6', name: 'Half Tonne', icon: 'Trophy', earned: false, desc: 'Recycle 500kg total' },
]

export const testimonials = [
  {
    id: 't1',
    name: 'Rohan Mehta',
    role: 'Early Adopter, Bandra',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Rohan',
    quote: 'The fill-level alerts changed how our building manages waste — no more overflowing bins on collection day.',
  },
  {
    id: 't2',
    name: 'Sneha Kulkarni',
    role: 'Society Secretary, Powai',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Sneha',
    quote: 'Turning recycling into tokens got our whole housing society competing on the leaderboard. Genuinely fun.',
  },
  {
    id: 't3',
    name: 'Arjun Nair',
    role: 'Sustainability Lead, Andheri',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Arjun',
    quote: 'The analytics dashboard gives us numbers we can actually report to residents. Transparent and motivating.',
  },
]

export const faqs = [
  {
    q: 'How do I earn reward tokens?',
    a: 'Every time you deposit sorted waste into a registered smart bin, its sensor verifies the weight and category, and tokens are credited to your account automatically.',
  },
  {
    q: 'What can I redeem tokens for?',
    a: 'Tokens can be exchanged for eco-friendly products, grocery vouchers, entertainment tickets, and impact-driven rewards like tree plantations.',
  },
  {
    q: 'How does the smart bin know what I threw away?',
    a: 'Each bin uses weight and infrared sensors paired with a sorting camera to classify waste into recyclable, organic, general, or e-waste categories.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Only your recycling activity and aggregated impact stats are used to calculate rewards and leaderboard rank — nothing is sold to third parties.',
  },
  {
    q: 'Can I use EcoLoop without a smart bin nearby?',
    a: "We're expanding our bin network monthly. You can request a bin for your neighborhood from the Contact page.",
  },
]

export const teamMembers = [
  { name: 'Neha Kapoor', role: 'Founder & CEO', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Neha' },
  { name: 'Devansh Rao', role: 'Hardware Lead (ESP32)', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Devansh' },
  { name: 'Fatima Sheikh', role: 'Product Design', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Fatima' },
  { name: 'Aryan Kulkarni', role: 'Full-stack Engineer', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Aryan' },
]
