"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Check, X, AlertTriangle } from "lucide-react"
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-800 to-gray-900">
      <Card className="w-full max-w-md shadow-lg rounded-xl border border-gray-700">
        <CardHeader className="bg-red-600 text-white p-4 rounded-t-xl">
          <CardTitle className="text-2xl font-semibold text-center">Ticket Scanner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {scanning ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-600">
              <QrScanner onScan={handleScan} />
            </div>
          ) : loading ? (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-gray-700 p-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium text-white">Verifying ticket...</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className={`flex flex-col p-6 rounded-lg ${
                result.valid 
                  ? (result.alreadyScanned ? "bg-yellow-600" : "bg-green-500") 
                  : "bg-red-500"
              }`}>
                <div className="flex items-center mb-4">
                  {result.valid ? (
                    result.alreadyScanned ? (
                      <AlertTriangle className="h-10 w-10 text-white mr-4" />
                    ) : (
                      <Check className="h-10 w-10 text-white mr-4" />
                    )
                  ) : (
                    <X className="h-10 w-10 text-white mr-4" />
                  )}
                  <h3 className="text-xl font-semibold text-white">
                    {result.valid 
                      ? (result.alreadyScanned ? "Already Scanned" : "Valid Ticket") 
                      : "Invalid Ticket"}
                  </h3>
                </div>
                
                {result.alreadyScanned && (
                  <div className="mb-4 p-3 rounded-lg bg-black bg-opacity-30">
                    <p className="text-white text-center font-medium">
                      This ticket was scanned previously
                    </p>
                  </div>
                )}

                <div className="text-lg font-medium text-white">
                  <p className="text-gray-200">Ticket ID: <span className="font-bold break-all">{result.data}</span></p>
                  {result.valid && result.details && (
                    <div className="mt-4 space-y-2 bg-gray-800 p-4 rounded-lg shadow-md">
                      <p className="text-lg text-white truncate max-w-full overflow-hidden text-ellipsis">
                        <strong className="text-red-600">Buyer:</strong> {result.details.buyerName || "N/A"}
                      </p>
                      <p className="text-lg text-white truncate max-w-full overflow-hidden text-ellipsis">
                        <strong className="text-red-600">Email:</strong> <span className="break-all">{result.details.emailAddress || "No email provided"}</span>
                      </p>
                      <p className="text-lg text-white truncate max-w-full overflow-hidden text-ellipsis">
                        <strong className="text-red-600">Event:</strong> {result.details.eventName || "No event name provided"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-gray-700 p-6">
              <Camera className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 bg-gray-800">
          <Button
            onClick={startScanning}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
            disabled={scanning || loading}
          >
            {scanning ? "Scanning..." : result ? "Scan Another Ticket" : "Start Scanning"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}