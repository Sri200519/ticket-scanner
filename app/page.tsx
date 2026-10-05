"use client"

import { useState } from "react"
import { AlertTriangle, ArrowRight, Camera, Check, RotateCcw, ShieldCheck, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import QrScanner from "@/components/qr-scanner"
import { verifyQrCode } from "../lib/verify-qr-code"

export default function Home() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{
    valid: boolean
    data: string
    alreadyScanned?: boolean
    details?: {
      emailAddress?: string
      eventName?: string
      buyerName?: string
    }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [scannerSession, setScannerSession] = useState(0)

  const handleScan = async (data: string) => {
    if (data && !loading) {
      setLoading(true)
      setScanning(false)
      try {
        const verificationResult = await verifyQrCode(data)
        setResult({
          valid: verificationResult.valid,
          data,
          alreadyScanned: verificationResult.alreadyScanned,
          details: verificationResult.details,
        })
      } catch (error) {
        console.error("Error verifying QR code:", error)
        setResult({
          valid: false,
          data,
          details: { emailAddress: "Error verifying ticket" },
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const startScanning = () => {
    setScanning(true)
    setResult(null)
  }

  const resetCamera = () => {
    setScannerSession((session) => session + 1)
  }

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-red-600/[0.08] blur-3xl" />
        <div className="absolute -bottom-52 -left-40 h-[32rem] w-[32rem] rounded-full bg-orange-500/[0.05] blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.18fr_0.82fr] lg:gap-16">
        <section className="order-2 max-w-xl lg:pb-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium tracking-wide text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Check-in system online
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-red-500">
            Door operations
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
            Guests in. Lines moving.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">
            Scan and verify every ticket in seconds. Clear results keep your team confident and the entrance moving.
          </p>

          <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <Zap className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-zinc-100">Instant checks</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Fast feedback at the door</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-zinc-100">Verified entry</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Valid, duplicate, or invalid</p>
            </div>
          </div>
        </section>

        <section className="order-1 mx-auto w-full max-w-xl">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#151515] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-semibold text-white">Ticket scanner</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {scanning ? "Point the camera at a QR code" : loading ? "Checking ticket details" : result ? "Verification complete" : "Ready for the next guest"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {scanning && (
                  <button
                    type="button"
                    onClick={resetCamera}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label="Reset camera"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reset camera</span>
                  </button>
                )}
                <div className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${scanning ? "bg-red-500/10 text-red-400" : "bg-white/[0.05] text-zinc-400"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${scanning ? "bg-red-500" : "bg-zinc-600"}`} />
                  {scanning ? "Live" : "Standby"}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {scanning ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-600 bg-black shadow-inner">
                  <QrScanner key={scannerSession} onScan={handleScan} />
                </div>
              ) : loading ? (
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-white/[0.08] bg-gray-700 p-4">
                  <div className="text-center">
                    <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-b-4 border-b-red-600" />
                    <p className="text-base font-semibold text-white">Verifying ticket...</p>
                    <p className="mt-1 text-sm text-zinc-400">This will only take a moment</p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className={`flex min-h-[23rem] flex-col rounded-2xl p-5 sm:p-6 ${
                    result.valid
                      ? (result.alreadyScanned ? "bg-yellow-600" : "bg-green-500")
                      : "bg-red-500"
                  }`}>
                    <div className="flex items-center border-b border-white/20 pb-5">
                      <div className="mr-4 flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white/15">
                        {result.valid ? (
                          result.alreadyScanned ? (
                            <AlertTriangle className="h-7 w-7 text-white" />
                          ) : (
                            <Check className="h-7 w-7 text-white" />
                          )
                        ) : (
                          <X className="h-7 w-7 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Scan result</p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                          {result.valid
                            ? (result.alreadyScanned ? "Already Scanned" : "Valid Ticket")
                            : "Invalid Ticket"}
                        </h2>
                      </div>
                    </div>

                    {result.alreadyScanned && (
                      <div className="mt-4 rounded-xl bg-black/30 p-3">
                        <p className="text-center text-sm font-medium text-white">
                          This ticket was scanned previously
                        </p>
                      </div>
                    )}

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Ticket ID</p>
                      <p className="mt-1 break-all text-sm font-semibold leading-6 text-white">{result.data}</p>

                      {result.valid && result.details && (
                        <dl className="mt-5 divide-y divide-white/10 rounded-xl bg-gray-800 px-4 shadow-md">
                          <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-3 text-sm">
                            <dt className="text-red-600">Buyer</dt>
                            <dd className="min-w-0 truncate text-right font-medium text-white">{result.details.buyerName || "N/A"}</dd>
                          </div>
                          <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-3 text-sm">
                            <dt className="text-red-600">Email</dt>
                            <dd className="min-w-0 break-all text-right font-medium text-white">{result.details.emailAddress || "No email provided"}</dd>
                          </div>
                          <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-3 text-sm">
                            <dt className="text-red-600">Event</dt>
                            <dd className="min-w-0 truncate text-right font-medium text-white">{result.details.eventName || "No event name provided"}</dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-gray-700 p-6">
                  <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:32px_32px]" />
                  <div className="relative text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-black/20 text-gray-400 shadow-2xl">
                      <Camera className="h-9 w-9" />
                    </div>
                    <p className="mt-5 text-sm font-semibold text-zinc-200">Camera is ready</p>
                    <p className="mt-1 text-xs text-zinc-400">Tap below to begin scanning</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.08] bg-black/20 p-4 sm:px-6 sm:py-5">
              <Button
                onClick={startScanning}
                className="h-12 w-full rounded-xl bg-red-600 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(220,38,38,0.2)] transition-all hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[0_14px_36px_rgba(220,38,38,0.28)]"
                disabled={scanning || loading}
              >
                {scanning ? "Scanning..." : result ? "Scan Another Ticket" : "Start Scanning"}
                {!scanning && !loading && <ArrowRight className="h-4 w-4" />}
              </Button>
              <p className="mt-3 text-center text-[11px] leading-4 text-zinc-600">
                Camera access is used only while scanning
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
