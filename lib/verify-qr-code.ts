/**
 * Verify a QR code by calling the secure server-side API
 * @param ticketId The ticket ID from the scanned QR code
 * @returns Promise with verification result
 */
export async function verifyQrCode(ticketId: string): Promise<{
  valid: boolean
  details?: {
    emailAddress?: string
    eventName?: string
    buyerName?: string // Added buyerName to the result details
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
        details: {
          emailAddress: `Server error: ${response.status}`,
        },
      }
    }

    const result = await response.json()
    console.log("Verification result from API:", result)

    // Add buyerName to the details if available
    const updatedResult = {
      valid: result.valid,
      details: {
        ...result.details,
        buyerName: result.details?.buyerName || "Unknown buyer", // Include buyer name if available
      }
    }

    return updatedResult
  } catch (error) {
    console.error("Error in verifyQrCode function:", error)
    return {
      valid: false,
      details: {
        emailAddress: error instanceof Error ? error.message : "Unknown error",
      },
    }
  }
}
