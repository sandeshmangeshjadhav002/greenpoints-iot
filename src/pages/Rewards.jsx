import { useState } from 'react'
import { Coins, Gift, CheckCircle2 } from 'lucide-react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { rewards } from '../data/rewards'
import { currentUser } from '../data/users'

export default function Rewards() {
  const [selected, setSelected] = useState(null)
  const [redeemed, setRedeemed] = useState(false)

  function openReward(reward) {
    setSelected(reward)
    setRedeemed(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Rewards' }]} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Rewards Store</h1>
          <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">Redeem tokens for real-world rewards</p>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
          <Coins size={18} className="text-leaf-500" />
          <span className="font-mono font-semibold">{currentUser.tokens.toLocaleString()} tokens</span>
        </div>
      </div>

      {rewards.length === 0 ? (
        <EmptyState icon={Gift} title="No rewards available" description="Available rewards will appear here when the catalog is connected." />
      ) : (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rewards.map((r) => {
          const affordable = currentUser.tokens >= r.tokens
          return (
            <Card key={r.id} className="flex flex-col overflow-hidden p-0">
              <div className="relative h-40 w-full overflow-hidden">
                <img src={r.image} alt={r.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
                <Badge variant="neutral" className="absolute left-3 top-3 bg-white/90 dark:bg-leaf-950/90">{r.category}</Badge>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display font-semibold">{r.name}</h3>
                <p className="mt-1.5 flex-1 text-xs text-leaf-700/70 dark:text-leaf-200/60">{r.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-mono text-sm font-bold text-leaf-600 dark:text-mint-400">
                    <Coins size={14} /> {r.tokens}
                  </span>
                  <Button
                    variant={affordable ? 'primary' : 'secondary'}
                    className="!px-4 !py-2 text-xs"
                    disabled={!affordable}
                    onClick={() => openReward(r)}
                  >
                    {affordable ? 'Redeem' : 'Locked'}
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={redeemed ? 'Redeemed!' : 'Confirm Redemption'}>
        {selected && !redeemed && (
          <div>
            <img src={selected.image} alt={selected.name} className="mb-4 h-36 w-full rounded-xl object-cover" />
            <p className="font-display font-semibold">{selected.name}</p>
            <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">{selected.description}</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-leaf-50 dark:bg-leaf-900 px-4 py-3">
              <span className="text-sm">Cost</span>
              <span className="flex items-center gap-1 font-mono font-bold text-leaf-600 dark:text-mint-400">
                <Coins size={14} /> {selected.tokens}
              </span>
            </div>
            <Button className="mt-5 w-full" onClick={() => setRedeemed(true)}>
              <Gift size={16} /> Confirm Redeem
            </Button>
          </div>
        )}
        {selected && redeemed && (
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle2 size={48} className="mb-3 text-leaf-500" />
            <p className="font-display font-semibold">{selected.name} redeemed!</p>
            <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">
              This is a UI-only demo — no tokens were actually deducted.
            </p>
            <Button variant="secondary" className="mt-5" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
