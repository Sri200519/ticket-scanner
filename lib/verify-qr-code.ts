/**
 * Verify a QR code by calling the secure server-side API
 * @param ticketId The ticket ID from the scanned QR code
 * @returns Promise with verification result including scan status
 */
export async function verifyQrCode(ticketId: string): Promise<{
  valid: boolean
  alreadyScanned?: boolean
  message?: string
  details?: {
    emailAddress?: string
    eventName?: string
    buyerName?: string
  }
}> {
  try {
    console.log(`Sending ticket ID for verification: ${ticketId}`)

    // Call the server-side API to verify the ticket
    const response = await fetch("/api/verify-ticket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticketId }),
    })

    console.log("API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server error (${response.status}):`, errorText)
      return {
        valid: false,
        message: `Server error: ${response.status}`,
        details: {
          emailAddress: "Verification failed",
        },
      }
    }

    const result = await response.json()
    console.log("Verification result from API:", result)

    // Format the result to match our expected structure
    return {
      valid: result.valid,
      alreadyScanned: result.alreadyScanned || false,
      message: result.message || result.warning,
      details: {
        emailAddress: result.details?.emailAddress,
        eventName: result.details?.eventName,
        buyerName: result.details?.buyerName || "Unknown buyer",
      }
    }
  } catch (error) {
    console.error("Error in verifyQrCode function:", error)
    return {
      valid: false,
      message: "Network error during verification",
      details: {
        emailAddress: error instanceof Error ? error.message : "Unknown error",
      },
    }
  }
}