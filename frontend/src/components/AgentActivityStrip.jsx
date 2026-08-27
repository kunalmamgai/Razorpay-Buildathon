import { useState, useEffect } from 'react'
import { fetchCampaignSchedule } from '../api'
import useCountdown from '../hooks/useCountdown'

function AgentActivityStrip() {
  const [schedule, setSchedule] = useState(null)

  useEffect(() => {
    let active = true
    const load = () => {
      fetchCampaignSchedule()
        .then(d => { if (active) setSchedule(d) })
        .catch(() => {})
    }
    load()
    const timer = setInterval(load, 15000)
    return () => { active = false; clearInterval(timer) }
  }, [])

  const countdown = useCountdown(schedule?.next_review_at)

  if (!schedule) return null

  const lastReviewed = schedule.last_review_at
    ? new Date(schedule.last_review_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-center gap-3 bg-dusk-card border border-dusk-border rounded-xl px-4 py-2.5 mb-4">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`absolute inline-flex h-full w-full rounded-full ${schedule.scheduler_running ? 'bg-approved opacity-75 pulse-active' : 'bg-gray-600'}`}></span>
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${schedule.scheduler_running ? 'bg-approved' : 'bg-gray-500'}`}></span>
      </span>
      <span className="text-sm font-medium text-gray-200">Agent Activity</span>
      <span className="text-xs text-gray-500">·</span>
      {schedule.scheduler_running && !countdown.expired ? (
        <span className="text-xs text-gray-400">
          Next autonomous review in{' '}
          <span className="font-mono text-clamped">{countdown.remainingLabel}</span>
          {' '}(every {schedule.interval_minutes} min)
        </span>
      ) : schedule.scheduler_running ? (
        <span className="text-xs text-gray-400 font-mono text-clamped">Review due — running...</span>
      ) : (
        <span className="text-xs text-gray-500">
          Scheduler offline — reviews run on manual trigger only
        </span>
      )}
      {lastReviewed && (
        <>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-500 ml-auto">Last review {lastReviewed}</span>
        </>
      )}
    </div>
  )
}

export default AgentActivityStrip
