import { useState, useEffect } from 'react'
import {
  Sparkles, Zap, Receipt, CreditCard, XCircle, RefreshCw, CheckCircle2,
  X, Settings, Lock, AlertTriangle, ShieldAlert, ArrowRight
} from 'lucide-react'
import { fetchOrderLifecycle } from '../api'

export default function FailureRecoveryView({ entry, onClose, onSimulateFailure }) {
  const [lifecycle, setLifecycle] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const orderId = entry?.razorpay_order_id
        if (orderId) {
          const data = await fetchOrderLifecycle(orderId)
          setLifecycle(data.entries || [entry])
        } else {
          setLifecycle([entry])
        }
      } catch {
        setLifecycle([entry])
      }
      setLoading(false)
    }
    load()
  }, [entry])

  const outcome = entry?.outcome || entry?.policy_decision || 'approved'
  const isFailed = outcome === 'failed'
  const isRejected = outcome === 'rejected'
  const isClamped = outcome === 'clamped' || entry?.policy_decision === 'clamped'

  const txSuffix = isFailed ? 'FAIL' : isRejected ? 'REJECTED' : isClamped ? 'CLAMPED' : 'PASS'
  const txTitle = entry?.id ? `TX_${entry.id}_${txSuffix}` : `TX_902B_${txSuffix}`
  const requestId = entry?.correlation_id ? `req_${entry.correlation_id.slice(0, 8)}` : `req_${Math.random().toString(36).substring(2, 8)}`

  let proposalJson = { discount: '25%', trigger: 'cart_abandonment_risk' }
  let finalActionJson = { clamped_to: '20%', reason: 'global_cap_reached' }
  let violations = []
  
  try { if (entry?.proposal_json) proposalJson = JSON.parse(entry.proposal_json) } catch {}
  try { if (entry?.final_action_json) finalActionJson = JSON.parse(entry.final_action_json) } catch {}
  try { if (entry?.policy_violations_json) violations = JSON.parse(entry.policy_violations_json) } catch {}

  const violationText = violations.length > 0 ? violations[0] : 'Margin threshold violation detected on target SKU. Max allowed 20%.'

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Backdrop Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-[#0c0e17] border-l border-gray-800/80 shadow-2xl h-full flex flex-col justify-between z-10 overflow-y-auto font-sans">
        
        {/* Drawer Content Area */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div>
              <h2 className="text-lg font-extrabold font-mono text-white tracking-tight">
                {txTitle}
              </h2>
              <p className="text-xs font-mono text-gray-500 mt-0.5">
                ID: {requestId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Callout Box based on Outcome (Failed, Rejected, Clamped, Approved) */}
          {isFailed && (
            <div className="bg-[#1a1017] border border-rose-500/30 rounded-xl p-4 text-xs font-mono space-y-1.5 shadow-lg">
              <span className="font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                AI Intervention & Failure Recovery
              </span>
              <p className="text-gray-300 leading-relaxed font-sans text-[11px]">
                Payment processing failed due to upstream timeout. System successfully reverted state to baseline pricing parameters without data loss.
              </p>
            </div>
          )}

          {isRejected && (
            <div className="bg-[#1c1214] border border-rose-500/40 rounded-xl p-4 text-xs font-mono space-y-1.5 shadow-lg">
              <span className="font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Policy Boundary Violation (Execution Blocked)
              </span>
              <p className="text-gray-300 leading-relaxed font-sans text-[11px]">
                AI proposal violated hard safety boundaries. The deterministic policy engine rejected execution; zero order state was committed to the ledger.
              </p>
            </div>
          )}

          {isClamped && (
            <div className="bg-[#1c1912] border border-amber-500/40 rounded-xl p-4 text-xs font-mono space-y-1.5 shadow-lg">
              <span className="font-bold text-amber-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Policy Guardrail Enforcement (Discount Capped)
              </span>
              <p className="text-gray-300 leading-relaxed font-sans text-[11px]">
                AI proposed a high discount, but the hardcoded policy engine clamped the discount value down to the compliance safety threshold before order creation.
              </p>
            </div>
          )}

          {!isFailed && !isRejected && !isClamped && (
            <div className="bg-[#10172e] border border-blue-500/30 rounded-xl p-4 text-xs font-mono space-y-1.5 shadow-lg">
              <span className="font-bold text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                Approved Execution Stream
              </span>
              <p className="text-gray-300 leading-relaxed font-sans text-[11px]">
                AI proposed dynamic pricing offer passed deterministic policy engine check and committed safely to public ledger.
              </p>
            </div>
          )}

          {/* Vertical Timeline Feed */}
          {loading ? (
            <div className="text-center py-12 text-gray-500 font-mono text-xs">
              Loading transaction lifecycle events...
            </div>
          ) : (
            <div className="relative pl-3">
              {/* Vertical line connecting nodes */}
              <div className="absolute left-[19px] top-3 bottom-3 w-[2px] bg-gray-800" />

              <div className="space-y-6">
                
                {/* STEP 1: AI PROPOSED */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-9 h-9 rounded-full bg-blue-500/15 border-2 border-blue-400 text-blue-300 flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-blue-400 tracking-wider">AI PROPOSED</span>
                      <span className="text-[11px] text-gray-400">14:02:11.092 UTC</span>
                    </div>
                    <div className="bg-[#090b12] border border-white/5 rounded-lg p-3 font-mono text-xs text-cyan-200">
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(proposalJson, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* STEP 2: POLICY CHECK */}
                <div className="flex items-start gap-4 relative">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10 shadow-sm ${
                    isRejected ? 'bg-rose-500/15 border-rose-400 text-rose-400' :
                    isClamped ? 'bg-amber-500/15 border-amber-400 text-amber-300' :
                    'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                  }`}>
                    {isRejected ? <X className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className={`font-bold tracking-wider ${
                        isRejected ? 'text-rose-400' : isClamped ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        POLICY CHECK ({isRejected ? 'REJECTED' : isClamped ? 'CLAMPED' : 'APPROVED'})
                      </span>
                      <span className="text-[11px] text-gray-400">14:02:11.145 UTC</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      {isRejected ? 'Hard rule violation detected.' : isClamped ? 'Rule max_discount_limit applied.' : 'All deterministic rules passed.'}
                    </p>

                    {isRejected ? (
                      <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-3 font-mono text-xs text-rose-300">
                        <pre className="whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify({ decision: 'REJECTED', violation: violationText }, null, 2)}
                        </pre>
                      </div>
                    ) : isClamped ? (
                      <div className="bg-[#090b12] border border-white/5 rounded-lg p-3 font-mono text-xs text-amber-200">
                        <pre className="whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(finalActionJson, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-[#090b12] border border-white/5 rounded-lg p-3 font-mono text-xs text-emerald-200">
                        <pre className="whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify({ decision: 'APPROVED', verified_limit: '20%' }, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* REJECTED OUTCOME SPECIFIC STEPS */}
                {isRejected && (
                  <div className="flex items-start gap-4 relative">
                    <div className="w-9 h-9 rounded-full bg-rose-500/15 border-2 border-rose-400 text-rose-400 flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-rose-400 tracking-wider">EXECUTION ABORTED</span>
                        <span className="text-[11px] text-rose-400">14:02:11.160 UTC</span>
                      </div>
                      <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-3 font-mono text-xs text-rose-300">
                        Baseline store price maintained. Zero order state committed.
                      </div>
                    </div>
                  </div>
                )}

                {/* NON-REJECTED OUTCOME STEPS (ORDER & PAYMENT) */}
                {!isRejected && (
                  <>
                    {/* STEP 3: ORDER GENERATED */}
                    <div className="flex items-start gap-4 relative">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/15 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-sm">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="font-bold text-emerald-400 tracking-wider">ORDER GENERATED</span>
                          <span className="text-[11px] text-gray-400">14:02:11.200 UTC</span>
                        </div>
                        <p className="text-xs text-gray-300 font-mono">
                          Order <span className="text-emerald-300 font-bold">ORD-992-X1</span> committed to ledger.
                        </p>
                      </div>
                    </div>

                    {/* STEP 4: PAYMENT INITIATED / CAPTURED / FAILED */}
                    <div className="flex items-start gap-4 relative">
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10 shadow-sm ${
                        isFailed ? 'bg-rose-500/15 border-rose-400 text-rose-400' : 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                      }`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className={`font-bold tracking-wider ${isFailed ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isFailed ? 'PAYMENT INITIATED' : 'PAYMENT CAPTURED'}
                          </span>
                          <span className="text-[11px] text-gray-400">14:02:11.450 UTC</span>
                        </div>
                        <p className="text-xs text-gray-300 font-mono">
                          {isFailed ? 'Request sent to gateway provider.' : 'Payment captured successfully via Razorpay gateway.'}
                        </p>
                      </div>
                    </div>

                    {/* FAILED SPECIFIC RECOVERY STEPS */}
                    {isFailed && (
                      <>
                        <div className="flex items-start gap-4 relative">
                          <div className="w-9 h-9 rounded-full bg-rose-500/15 border-2 border-rose-400 text-rose-400 flex items-center justify-center shrink-0 z-10 shadow-sm">
                            <XCircle className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center justify-between font-mono text-xs">
                              <span className="font-bold text-rose-400 tracking-wider">PAYMENT FAILED</span>
                              <span className="text-[11px] text-rose-400">14:02:41.501 UTC</span>
                            </div>
                            <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-3 font-mono text-xs text-rose-300">
                              ERR_GATEWAY_TIMEOUT: Provider did not respond within 30000ms.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 relative">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/15 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center shrink-0 z-10 shadow-sm">
                            <RefreshCw className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center justify-between font-mono text-xs">
                              <span className="font-bold text-emerald-400 tracking-wider">STATE REVERTED</span>
                              <span className="text-[11px] text-emerald-400">14:02:41.550 UTC</span>
                            </div>
                            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-3 font-mono text-xs text-emerald-300 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Restored base price. Discount lock released.</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

              </div>
            </div>
          )}

        </div>

        {/* Footer Area with Action Button */}
        <div className="p-5 border-t border-gray-800 bg-[#080a10] flex justify-end">
          {entry?.razorpay_order_id ? (
            <button
              onClick={() => {
                onSimulateFailure(entry.razorpay_order_id)
                onClose()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#121625] border border-white/10 hover:border-cyan-500/40 rounded-xl text-xs font-mono font-semibold text-gray-300 hover:text-white transition shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              Simulate Payment Failure
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-[#121625] border border-white/10 hover:border-cyan-500/40 rounded-xl text-xs font-mono font-semibold text-gray-300 hover:text-white transition"
            >
              Close Inspection
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
