"use client"

import { useEffect, useRef, useState } from "react"
import jsQR from "jsqr"

interface QrScannerProps {
  onScan: (data: string) => void
}

export default function QrScanner({ onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    let animationFrameId: number | null = null
    let stream: MediaStream | null = null
    let cancelled = false

    if (!video || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not available. Open this page over HTTPS in Safari or Chrome and allow camera access.")
      return
    }

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        video.srcObject = stream
        video.setAttribute("playsinline", "true") // required for iOS
        await video.play()
        animationFrameId = requestAnimationFrame(tick)
      } catch (err) {
        if (!cancelled) {
          setError("Camera access denied or not available")
          console.error("Error accessing camera:", err)
        }
      }
    }

    void startCamera()

    function tick() {
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Ensure canvas and context are available
        if (!canvas || !ctx) return

        // Only proceed if video is not null
        if (video) {
          canvas.height = video.videoHeight
          canvas.width = video.videoWidth
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          })

          if (code) {
            // Draw a border around the QR code
            ctx.beginPath()
            ctx.lineWidth = 4
            ctx.strokeStyle = "#FF3B58"
            ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y)
            ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y)
            ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y)
            ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y)
            ctx.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y)
            ctx.stroke()

            onScan(code.data)
            return
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick)
    }

    return () => {
      cancelled = true
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
  }, [onScan])

  return (
    <>
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-4 text-center">
          {error}
        </div>
      )}
    </>
  )
}
