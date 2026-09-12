import { useState, useEffect, useCallback } from 'react'
import { Gift, CheckCircle2, XCircle, Clock, RefreshCw, Store, AlertCircle } from 'lucide-react'
import Card from '../components/Card'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const STATUS_STYLE = {
  pending:   'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
  fulfilled: 'text-leaf-600 bg-leaf-100 dark:bg-leaf-900 dark:text-mint-400',
  rejected:  'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300',
}

const FILTER_OPTIONS = ['pending', 'fulfilled', 'rejected', 'all']

export default function ShopDashboard() {
  const { apiFetch } = useAuth()

  const [shopInfo, setShopInfo]       = useState(null)
  const [redemptions, setRedemptions] = useState([])
  const [filter, setFilter]           = useState('pending')
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)   // redemption being actioned
  const [action, setAction]           = useState(null)   // 'fulfill' | 'reject'
  const [notes, setNotes]             = useState('')
  const [working, setWorking]         = useState(false)
  const [feedback, setFeedback]       = useState('')

  const load = useCallback(async (status = filter) => {
    setLoading(true)
    try {
      const [info, list] = await Promise.all([
        apiFetch('/api/shop/info'),
        apiFetch(`/api/shop/redemptions?status=${status}&limit=100`),
      ])
      setShopInfo(info.data)
      setRedemptions(list.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [apiFetch, filter])

  useEffect(() => { load(filter) }, [filter])  // eslint-disable-line react-hooks/exhaustive-deps

  function openAction(redemption, type) {
    setSelected(redemption)
    setAction(type)
    setNotes('')
    setFeedback('')
  }

  async function confirmAction() {
    if (!selected || !action) return
    setWorking(true)
    try {
      await apiFetch(`/api/shop/redemptions/${selected.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      })
      setFeedback(action === 'fulfill' ? 'Redemption fulfilled!' : 'Redemption rejected and tokens refunded.')
      setRedemptions((prev) => prev.filter((r) => r.id !== selected.id))
      if (shopInfo) {
        setShopInfo((s) => ({ ...s, pending_count: Math.max(0, (s?.pending_count ?? 1) - 1) }))
      }
      setSelected(null)
      setAction(null)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumb items={[{ label: 'Shop Dashboard' }]} />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Store size={22} className="text-leaf-500" />
            <h1 className="font-display text-2xl font-bold">
              {shopInfo?.shop_name ?? 'Shop Dashboard'}
            </h1>
          </div>
          <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
            Manage reward redemptions from EcoLoop users
          </p>
        </div>
        <div className="flex items-center gap-3">
          {shopInfo?.pending_count > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-sm font-semibold text-amber-600 dark:text-amber-300">
              <Clock size={14} /> {shopInfo.pending_count} pending
            </span>
          )}
          <button
            onClick={() => load(filter)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-leaf-200 dark:border-leaf-800 px-4 py-2 text-sm hover:bg-leaf-50 dark:hover:bg-leaf-900 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={classNames(
          'mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm',
          feedback.startsWith('Error')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : 'bg-leaf-50 dark:bg-leaf-900/60 text-leaf-700 dark:text-mint-400',
        )}>
          {feedback.startsWith('Error') ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          {feedback}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === f
                ? 'bg-gradient-to-r from-leaf-500 to-sky-500 text-white shadow-lg'
                : 'glass text-leaf-700 dark:text-leaf-100 hover:bg-leaf-100 dark:hover:bg-leaf-900',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <EmptyState icon={Gift} title="Loading redemptions…" description="Fetching redemption data." />
      ) : redemptions.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={filter === 'pending' ? 'No pending redemptions' : `No ${filter} redemptions`}
          description={filter === 'pending' ? 'All caught up — no users are waiting.' : 'Nothing to show here.'}
        />
      ) : (
        <div className="space-y-3">
          {redemptions.map((r) => (
            <Card key={r.id} hover={false} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-lg">
                <Gift size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{r.reward_name}</p>
                  <span className={classNames('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', STATUS_STYLE[r.status] || STATUS_STYLE.pending)}>
                    {r.status}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-leaf-700/70 dark:text-leaf-200/60">
                  User: <span className="font-medium">{r.user_name}</span>
                  {' · '}{r.token_cost} tokens
                  {' · '}<span className="text-xs">{r.created_at}</span>
                </p>
                {r.notes && (
                  <p className="mt-1 text-xs text-leaf-700/50 dark:text-leaf-200/40">Note: {r.notes}</p>
                )}
              </div>

              {r.status === 'pending' && (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openAction(r, 'fulfill')}
                    className="flex items-center gap-1.5 rounded-xl bg-leaf-500 px-3 py-2 text-xs font-semibold text-white hover:bg-leaf-600"
                  >
                    <CheckCircle2 size={14} /> Fulfill
                  </button>
                  <button
                    onClick={() => openAction(r, 'reject')}
                    className="flex items-center gap-1.5 rounded-xl border border-red-300 dark:border-red-800 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {r.status === 'fulfilled' && (
                <p className="shrink-0 text-xs text-leaf-700/50 dark:text-leaf-200/40">
                  {r.fulfilled_at}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setAction(null) }}
        title={action === 'fulfill' ? 'Confirm Fulfillment' : 'Reject Redemption'}
      >
        {selected && (
          <div>
            <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
              {action === 'fulfill'
                ? `Mark "${selected.reward_name}" for ${selected.user_name} as fulfilled?`
                : `Reject "${selected.reward_name}" and refund ${selected.token_cost} tokens to ${selected.user_name}?`}
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === 'fulfill' ? 'e.g. Handed over at counter 3' : 'Reason for rejection'}
                className="w-full rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-4 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"
              />
            </div>
            {feedback && (
              <p className={classNames('mt-3 text-sm', feedback.startsWith('Error') ? 'text-red-500' : 'text-leaf-600 dark:text-mint-400')}>
                {feedback}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                className={classNames('flex-1', action === 'reject' && '!bg-red-500 hover:!bg-red-600')}
                disabled={working}
                onClick={confirmAction}
              >
                {working ? 'Processing…' : action === 'fulfill' ? 'Confirm' : 'Reject & Refund'}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => { setSelected(null); setAction(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
