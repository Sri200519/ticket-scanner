import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import * as path from 'path';
import { getFirestore, Timestamp, Firestore, Query, DocumentData } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

// Load environment variables
config({ path: '.env.local' });

// --- HELPER FUNCTION TO DELETE OLD DATA ---
// This ensures that running the script multiple times doesn't create duplicate data.
async function deleteCollection(db: Firestore, collectionPath: string, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise<void>((resolve, reject) => {
    deleteQueryBatch(db, query, () => resolve()).catch(reject);
  });

  async function deleteQueryBatch(db: Firestore, query: Query<DocumentData>, resolve: () => void) {
    const snapshot = await query.get();
    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve);
    });
  }
}


async function main() {
  // Initialize Firebase Admin SDK if not already initialized
  if (!getApps().length) {
    try {
        const serviceAccountPath = path.join(process.cwd(), 'mirchi-ticket-website.json');
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
        });
    } catch (error) {
        console.error("Error initializing Firebase Admin SDK. Make sure 'mirchi-ticket-website.json' exists and is configured correctly.", error);
        process.exit(1);
    }
  }

  const db = getFirestore();

  // --- HARDCODED TEST DATA CONFIGURATION ---
  // Each event has predictable, non-random values for testing.
  const events = [
    { 
      id: 'summer_fest_2023',
      event_name: 'Summer Fest 2023',
      totalTickets: 1500,
      ticketsSold: 1300, // 87% sold
      atDoorTickets: 200,
      validScans: 1274,   // 98% scan rate
      invalidScans: 15,
    },
    {
      id: 'winter_gala_2023',
      event_name: 'Winter Gala 2023',
      totalTickets: 800,
      ticketsSold: 700,    // 87.5% sold
      atDoorTickets: 100,
      validScans: 672,     // 96% scan rate
      invalidScans: 25,
    },
    {
      id: 'spring_show_2024',
      event_name: 'Spring Show 2024',
      totalTickets: 1200,
      ticketsSold: 1000,   // 83% sold
      atDoorTickets: 200,
      validScans: 970,     // 97% scan rate
      invalidScans: 10,
    }
  ];

  // This function is still needed to generate placeholder user data.
  function generateRandomRecipients(count: number) {
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com'];
    const recipients = [];
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      recipients.push({
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domains[Math.floor(Math.random() * domains.length)]}`,
        name: `${firstName} ${lastName}`,
        timestamp: Timestamp.now()
      });
    }
    return recipients;
  }

  // --- REWRITTEN SCAN GENERATION ---
  // This function now generates a precise number of scans based on the hardcoded config.
  async function generateDeterministicScans(eventId: string, targetScans: number, isInvalid = false) {
    const scanData = [];
    const now = new Date();
    let scansToDistribute = targetScans;
    
    // Distribute scans across event hours (10 AM to 10 PM)
    for (let hour = 10; hour <= 22; hour++) {
        if (scansToDistribute <= 0) continue;

        // Distribute a portion of the remaining scans, with a bit of variance
        const isPeakHour = (hour === 12 || hour === 19);
        const portion = isPeakHour ? 0.2 : 0.07; // 20% on peak hours, 7% otherwise
        let countForHour = Math.min(scansToDistribute, Math.ceil(targetScans * portion));
        
        // On the last hour, just take all remaining scans
        if (hour === 22) {
            countForHour = scansToDistribute;
        }

        scansToDistribute -= countForHour;

        if (countForHour > 0) {
            const scanTime = new Date(now);
            scanTime.setHours(hour, 0, 0, 0);
            const hourKey = scanTime.toISOString().split('T')[0] + `_${hour.toString().padStart(2, '0')}`;
            
            scanData.push({
                hourKey,
                data: {
                    count: countForHour,
                    timestamp: Timestamp.fromDate(scanTime),
                    location: isInvalid ? 'Unknown' : 'Main Entrance',
                    device_id: `scanner-${(hour % 3) + 1}`,
                }
            });
        }
    }

    // Write the generated scan data to Firestore
    for (const scan of scanData) {
        const collectionPath = isInvalid ? 'invalid_scans' : 'valid_scans';
        await db.doc(`analytics/${eventId}/${collectionPath}/${scan.hourKey}`).set(scan.data);
    }

    return targetScans - scansToDistribute; // Should return the original targetScans
  }

  // --- MAIN SEEDING LOGIC ---
  async function seedData() {
    console.log('🚀 Starting analytics data seeding with predictable data...\n');

    for (const event of events) {
        console.log(`📦 Processing: ${event.event_name}`);

        // ** Step 1: Clear old data for this event **
        console.log(`🧹 Clearing old scan data for ${event.id}...`);
        await deleteCollection(db, `analytics/${event.id}/valid_scans`);
        await deleteCollection(db, `analytics/${event.id}/invalid_scans`);
        
        // ** Step 2: Create the main event document with hardcoded numbers **
        const eventRef = db.collection('analytics').doc(event.id);
        await eventRef.set({
            event_name: event.event_name,
            total_tickets: event.totalTickets,
            tickets_sold: event.ticketsSold,
            at_door_tickets: event.atDoorTickets,
            recipients: generateRandomRecipients(event.ticketsSold), // Still need placeholder recipients
            status: 'active',
            last_updated: Timestamp.now()
        }, { merge: true });

        console.log(`✅ Created event document for: ${event.event_name}`);
        console.log(`   - Pre-sold Tickets: ${event.ticketsSold}`);
        console.log(`   - At-door Tickets: ${event.atDoorTickets}`);

        // ** Step 3: Generate the exact number of valid and invalid scans **
        const totalValidGenerated = await generateDeterministicScans(event.id, event.validScans, false);
        console.log(`   - Generated ${totalValidGenerated} valid scans.`);

        const totalInvalidGenerated = await generateDeterministicScans(event.id, event.invalidScans, true);
        console.log(`   - Generated ${totalInvalidGenerated} invalid scans.\n`);
    }

    console.log('\n🎉 All analytics data seeded successfully with predictable values!');
  }

  try {
    await seedData();
  } catch (err) {
    console.error('🔥 Error seeding analytics data:', err);
  } finally {
    // The script will auto-exit when the async operations are done.
    // No need for process.exit(0) which can cut off operations.
  }
}

main().catch(console.error);
