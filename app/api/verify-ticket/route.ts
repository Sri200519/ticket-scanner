import { NextResponse } from "next/server"
import admin from "firebase-admin"
const EVENT_NAME = process.env.EVENT_NAME || 'Os 10-17'

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

    // Determine event collection name dynamically
    const configuredEventName = (process.env.EVENT_NAME || 'Os 10-17').replace(/^["']|["']$/g, "").trim()
    let targetEventName = configuredEventName
    let ticketRef = db.collection(targetEventName).doc(ticketId)

    // Check if the ticket ID exists in the configured event collection; if not, search all collections
    try {
      const initialDoc = await ticketRef.get()
      if (!initialDoc.exists) {
        console.log(`Ticket ${ticketId} not in ${targetEventName}, searching other collections...`)
        const collections = await db.listCollections()
        for (const col of collections) {
          if (col.id === 'analytics' || col.id === targetEventName) continue
          const candidateDoc = await col.doc(ticketId).get()
          if (candidateDoc.exists) {
            console.log(`Found ticket ${ticketId} in collection: ${col.id}`)
            targetEventName = col.id
            ticketRef = col.doc(ticketId)
            break
          }
        }
      }

      // Use a transaction to ensure atomic read/write operations
      const now = admin.firestore.Timestamp.now(); // Move now to the top of the transaction
      const result = await db.runTransaction(async (transaction) => {
        const ticketDoc = await transaction.get(ticketRef)

        if (!ticketDoc.exists) {
          const hourTimestamp = new Date(now.toDate())
          hourTimestamp.setMinutes(0, 0, 0)
          const hourKey = hourTimestamp.toISOString()
          const eventName = 'unknown_event'
          const safeEventName = eventName.replace(/\//g, "_") // <- already sanitized

          const invalidScansRef = db.collection('analytics')
            .doc(safeEventName)
            .collection('invalid_scans')
            .doc(hourKey)

          transaction.set(invalidScansRef, {
            count: admin.firestore.FieldValue.increment(1),
            last_updated: now,
            timestamp: now
          }, { merge: true })

          return { valid: false, alreadyScanned: false }
        }

        const ticketData = ticketDoc.data()
        const isAlreadyScanned = ticketData?.scanned === true
        const eventName = ticketData?.event_name || targetEventName

        // If already scanned in this transaction, return immediately
        if (ticketData?.scanned && ticketData.scannedAt?.toMillis() === now.toMillis()) {
          return {
            valid: true,
            alreadyScanned: true,
            details: {
              emailAddress: ticketData?.email_address || "No email provided",
              eventName: eventName,
              buyerName: ticketData?.buyer_name || "Unknown buyer",
            }
          };
        }

        const safeEventName = (ticketData?.event_name || targetEventName).replace(/\//g, "_")
        const hourTimestamp = new Date(now.toDate())
        hourTimestamp.setMinutes(0, 0, 0)
        const hourKey = hourTimestamp.toISOString()

        if (!isAlreadyScanned) {
          transaction.update(ticketRef, {
            scanned: true,
            scannedAt: now
          })

          const validScansRef = db.collection('analytics')
            .doc(safeEventName)
            .collection('valid_scans')
            .doc(hourKey)

          transaction.set(validScansRef, {
            count: admin.firestore.FieldValue.increment(1),
            last_updated: now,
            timestamp: now
          }, { merge: true })
        }

        if (isAlreadyScanned) {
          transaction.update(ticketRef, {
            scanned: true,
            scannedAt: now
          })

          const invalidScansRef = db.collection('analytics')
            .doc(safeEventName)
            .collection('invalid_scans')
            .doc(hourKey)

          transaction.set(invalidScansRef, {
            count: admin.firestore.FieldValue.increment(1),
            last_updated: now,
            timestamp: now
          }, { merge: true })
        }

        return {
          valid: true,
          alreadyScanned: isAlreadyScanned,
          details: {
            emailAddress: ticketData?.email_address || "No email provided",
            eventName: eventName,
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