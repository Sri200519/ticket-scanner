import { NextResponse } from "next/server"
import admin from "firebase-admin"

// Initialize Firebase Admin SDK if not already initialized
let app
if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
} else {
  app = admin.apps[0]!
}

export async function POST(request: Request) {
  try {
    console.log("API route called")

    // Parse the request body
    let ticketId
    try {
      const body = await request.json()
      ticketId = body.ticketId
      console.log("Received request with ticketId:", ticketId)
    } catch (error) {
      console.error("Error parsing request body:", error)
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid request format",
        },
        { status: 400 },
      )
    }

    if (!ticketId) {
      console.log("Missing ticketId in request")
      return NextResponse.json(
        {
          valid: false,
          error: "Ticket ID is required",
        },
        { status: 400 },
      )
    }

    console.log(`Verifying ticket ID: ${ticketId}`)

    // Check Firebase initialization
    if (!admin.apps.length) {
      console.log("Initializing Firebase Admin SDK")
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        })
        console.log("Firebase Admin SDK initialized successfully")
      } catch (error) {
        console.error("Error initializing Firebase Admin SDK:", error)
        return NextResponse.json(
          {
            valid: false,
            error: "Firebase initialization error",
          },
          { status: 500 },
        )
      }
    }

    const db = admin.firestore()

    // Check if the ticket ID exists in the Firestore database
    try {
      const ticketRef = db.collection("Spoke 4-4").doc(ticketId)
      
      // Use a transaction to ensure atomic read/write operations
      const result = await db.runTransaction(async (transaction) => {
        const ticketDoc = await transaction.get(ticketRef)
        
        if (!ticketDoc.exists) {
          return { valid: false, alreadyScanned: false }
        }
        
        const ticketData = ticketDoc.data()
        const isAlreadyScanned = ticketData?.scanned === true
        
        if (!isAlreadyScanned) {
          // Only update if not already scanned
          transaction.update(ticketRef, {
            scanned: true,
            scannedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        }
        
        return {
          valid: true,
          alreadyScanned: isAlreadyScanned,
          details: {
            emailAddress: ticketData?.email_address || "No email provided",
            eventName: ticketData?.event_name || "No event name provided",
            buyerName: ticketData?.buyer_name || "Unknown buyer",
          }
        }
      })

      if (!result.valid) {
        console.log("Ticket is invalid or not found.")
        return NextResponse.json({
          valid: false,
          error: "Ticket not found in database",
        })
      }

      if (result.alreadyScanned) {
        console.log("Ticket was already scanned.")
        return NextResponse.json({
          valid: false,
          alreadyScanned: true,
          details: result.details,
          warning: "This ticket was already scanned previously"
        })
      }

      console.log("Ticket is valid and marked as scanned.")
      return NextResponse.json({
        valid: true,
        alreadyScanned: false,
        details: result.details
      })

    } catch (error) {
      console.error("Error in transaction:", error)
      return NextResponse.json(
        {
          valid: false,
          error: "Database transaction error",
          details: {
            emailAddress: "Error processing ticket scan",
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Unhandled error in API route:", error)
    return NextResponse.json(
      {
        valid: false,
        error: "Server error",
        details: {
          emailAddress: error instanceof Error ? error.message : "Unknown server error",
        },
      },
      { status: 500 },
    )
  }
}