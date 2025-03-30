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
      const ticketDoc = await ticketRef.get()

      console.log(`Ticket exists: ${ticketDoc.exists}`)

      if (ticketDoc.exists) {
        const ticketData = ticketDoc.data()
        console.log("Ticket data:", ticketData)

        return NextResponse.json({
          valid: true,
          details: {
            phoneNumber: ticketData?.phone_number || "No email provided",
            eventName: ticketData?.event_name || "No event name provided",
            buyerName: ticketData?.buyer_name || "Unknown buyer", // Added buyerName to the response
          },
        })
      } else {
        console.log("Ticket is invalid or not found.")
        return NextResponse.json({
          valid: false,
          details: {
            phoneNumber: "Ticket not found in database",
          },
        })
      }
    } catch (error) {
      console.error("Error querying Firestore:", error)
      return NextResponse.json(
        {
          valid: false,
          error: "Database query error",
          details: {
            phoneNumber: "Error querying database",
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
          phoneNumber: error instanceof Error ? error.message : "Unknown server error",
        },
      },
      { status: 500 },
    )
  }
}
