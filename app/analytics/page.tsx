'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

// --- TYPE DEFINITIONS ---
interface EventData {
  id: string;
  name: string;
  tickets_sent: number;
  at_door_tickets: number;
  last_updated?: Timestamp;
  status?: string;
}

interface ScanData {
  count: number;
  timestamp: Timestamp | Date | string;
  location?: string;
  device_id?: string;
  is_at_door?: boolean;
}

interface AnalyticsData {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  notScanned: number;
  totalTickets: number;
  ticketsSent: number;
  atDoorTickets: number;
  busiestHour: { hour: string; count: number };
  mostInvalidHour: { hour: string; count: number };
  successRate: string;
  scanRate: string;
  eventStatus: string;
  lastUpdated: Date | null;
}

// --- HELPER FUNCTION ---
const formatHour = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', hour12: true });
};

export default function Analytics() {
  // --- STATE MANAGEMENT ---
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsData>({
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    notScanned: 0,
    totalTickets: 0,
    ticketsSent: 0,
    atDoorTickets: 0,
    busiestHour: { hour: 'N/A', count: 0 },
    mostInvalidHour: { hour: 'N/A', count: 0 },
    successRate: '0%',
    scanRate: '0%',
    eventStatus: 'loading',
    lastUpdated: null,
  });

  // --- DATA FETCHING LOGIC ---

  // Fetch the list of available events on initial component mount
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const eventsSnapshot = await getDocs(collection(db, 'analytics'));
        const eventList = eventsSnapshot.docs.map(doc => doc.id).filter(Boolean);
        
        if (eventList.length > 0) {
          setEvents(['all', ...eventList]);
          setSelectedEvent(eventList[0]); // Default to the first event
        } else {
          setEvents(['all']); // Still allow 'all' even if no events found
          setSelectedEvent('all');
          console.warn('No events found in Firestore.');
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents(['all']);
        setSelectedEvent('all');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Memoized function to fetch and process all analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!selectedEvent) return; // Don't run if no event is selected

    setLoading(true);
    
    try {
      const eventIds = selectedEvent === 'all'
        ? events.filter(e => e !== 'all') // Get all event IDs except the 'all' identifier
        : [selectedEvent];

      if (eventIds.length === 0 && selectedEvent === 'all') {
         console.warn("No events to aggregate.");
      }

      // Initialize aggregates
      let totalTickets = 0, ticketsSent = 0, atDoorTickets = 0;
      let totalValidScans = 0, totalInvalidScans = 0;
      const hourStats: Record<string, number> = {};
      const invalidHourStats: Record<string, number> = {};
      let lastUpdated: Date | null = null;
      let eventStatus = 'active';

      // Loop through each event ID to aggregate data
      for (const eventId of eventIds) {
        // 1. Get event metadata (ticket counts)
        const eventDoc = await getDoc(doc(db, 'analytics', eventId));
        if (eventDoc.exists()) {
          const data = eventDoc.data() as EventData;
          totalTickets += (data.tickets_sent || 0) + (data.at_door_tickets || 0);
          ticketsSent += data.tickets_sent || 0;
          atDoorTickets += data.at_door_tickets || 0;
          const docLastUpdated = data.last_updated?.toDate();
          if (docLastUpdated && (!lastUpdated || docLastUpdated > lastUpdated)) {
            lastUpdated = docLastUpdated;
          }
          if (selectedEvent !== 'all') {
            eventStatus = data.status || 'active';
          }
        }

        // 2. Process valid scans for the event
        const validScansSnapshot = await getDocs(collection(db, `analytics/${eventId}/valid_scans`));
        validScansSnapshot.forEach(scanDoc => {
          const data = scanDoc.data() as ScanData;
          const count = data.count || 0;
          totalValidScans += count;
          const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp as string);
          const hour = formatHour(timestamp);
          hourStats[hour] = (hourStats[hour] || 0) + count;
        });

        // 3. Process invalid scans for the event
        const invalidScansSnapshot = await getDocs(collection(db, `analytics/${eventId}/invalid_scans`));
        invalidScansSnapshot.forEach(scanDoc => {
          const data = scanDoc.data() as ScanData;
          const count = data.count || 0;
          totalInvalidScans += count;
          const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp as string);
          const hour = formatHour(timestamp);
          invalidHourStats[hour] = (invalidHourStats[hour] || 0) + count;
        });
      }

      // 4. Calculate final metrics from aggregated data
      const busiestHour = Object.entries(hourStats).reduce((max, [hour, count]) => (count > max.count ? { hour, count } : max), { hour: 'N/A', count: 0 });
      const mostInvalidHour = Object.entries(invalidHourStats).reduce((max, [hour, count]) => (count > max.count ? { hour, count } : max), { hour: 'N/A', count: 0 });
      const totalScans = totalValidScans + totalInvalidScans;
      const notScanned = Math.max(0, ticketsSent - totalValidScans);
      const successRate = totalScans > 0 ? `${Math.round((totalValidScans / totalScans) * 100)}%` : '0%';
      const scanRate = ticketsSent > 0 ? `${Math.round((totalValidScans / ticketsSent) * 100)}%` : '0%';

      // 5. Update state with all new data
      setStats({
        totalScans,
        validScans: totalValidScans,
        invalidScans: totalInvalidScans,
        notScanned,
        totalTickets,
        ticketsSent,
        atDoorTickets,
        busiestHour,
        mostInvalidHour,
        successRate,
        scanRate,
        eventStatus: selectedEvent === 'all' ? 'Aggregated' : eventStatus,
        lastUpdated,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setStats(prev => ({ ...prev, eventStatus: 'Error' }));
    } finally {
      setLoading(false);
    }
  }, [selectedEvent, events]);

  // Effect to trigger fetch on selection change and set up auto-refresh
  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, 15 * 60 * 1000); // 15-minute refresh
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // --- RENDER LOGIC ---

  // Stat card component
  interface StatCardProps {
    title: string;
    value: string | number;
    color?: 'green' | 'red' | 'cyan' | 'yellow' | 'purple';
    tooltip?: string;
  }

  const StatCard = ({ title, value, color, tooltip }: StatCardProps) => (
    <div className="aspect-square bg-gray-800/50 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-sm relative group flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <h3 className="text-xs sm:text-sm font-medium text-gray-400 line-clamp-2">{title}</h3>
        {tooltip && (
          <div className="text-gray-500 hover:text-gray-300 cursor-help flex-shrink-0 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="hidden group-hover:block absolute z-10 w-48 p-2 mt-1 -ml-2 text-xs text-gray-200 bg-gray-900 rounded shadow-lg">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <p className={`text-xl sm:text-2xl font-bold text-center ${
        color === 'green' ? 'text-green-400' : 
        color === 'red' ? 'text-red-400' : 
        color === 'cyan' ? 'text-cyan-400' : 
        color === 'yellow' ? 'text-yellow-400' : 
        'text-cyan-400'
      }`}>
        {value}
      </p>
      <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${
            color === 'green' ? 'bg-green-500' : 
            color === 'red' ? 'bg-red-500' : 
            color === 'cyan' ? 'bg-cyan-500' : 
            color === 'yellow' ? 'bg-yellow-500' : 'bg-cyan-500'
          }`}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Event Analytics
        </h2>
        
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <label htmlFor="event-select" className="sr-only">Select Event</label>
            <select
              id="event-select"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full sm:w-auto text-sm sm:text-base p-2 rounded-md bg-gray-800 border border-gray-600 text-white disabled:opacity-50"
              disabled={loading}
            >
              {events.map((event) => (
                <option key={event} value={event}>
                  {event === 'all' ? 'All Events' : event.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-cyan-600/80 hover:bg-cyan-500/80 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {loading && !stats.totalTickets ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-cyan-400">Loading Analytics...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* Core Metrics */}
            <div className="col-span-2 row-span-2 bg-gray-800/50 border border-cyan-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">Event Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Total Capacity</span>
                  <span className="text-sm font-medium">{stats.totalTickets.toLocaleString()}</span>
                </div>
                <div className="h-px bg-gray-700"></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Valid Scans</span>
                  <span className="text-sm font-medium">{stats.validScans.toLocaleString()}</span>
                </div>
                <div className="h-px bg-gray-700"></div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Not Scanned</span>
                  <span className={`text-sm font-medium ${stats.notScanned > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {stats.notScanned.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Scan Stats */}
            <StatCard 
              title="Total Scans" 
              value={stats.totalScans.toLocaleString()}
              color="yellow"
            />
            <StatCard 
              title="Invalid Scans" 
              value={stats.invalidScans.toLocaleString()}
              color="red"
            />
            <StatCard 
              title="Scan Rate" 
              value={stats.scanRate}
              color={parseInt(stats.scanRate) >= 80 ? 'green' : 'yellow'}
            />
            <StatCard 
              title="Success Rate" 
              value={stats.successRate}
              color={parseInt(stats.successRate) >= 95 ? 'green' : 'red'}
            />

            {/* Ticket Sales */}
            <div className="col-span-2 bg-gray-800/50 border border-cyan-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-cyan-300 mb-3">Ticket Sales</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Pre-sent:</span>
                  <span className="text-green-400">
                    {typeof stats.ticketsSent === 'number' ? stats.ticketsSent.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>At Door:</span>
                  <span className="text-blue-400">
                    {typeof stats.atDoorTickets === 'number' ? stats.atDoorTickets.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="h-px bg-gray-700 my-1"></div>
                <div className="flex justify-between text-xs font-medium">
                  <span>Total sent:</span>
                  <span>
                    {typeof stats.ticketsSent === 'number' && typeof stats.atDoorTickets === 'number' 
                      ? (stats.ticketsSent + stats.atDoorTickets).toLocaleString() 
                      : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Busy Hours */}
            <div className="bg-gray-800/50 border border-cyan-500/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-cyan-300 mb-2">Busiest Hour</h3>
              <p className="text-lg font-bold text-cyan-400">
                {stats.busiestHour.count > 0 ? stats.busiestHour.hour : '--:--'}
              </p>
              <p className="text-xs text-gray-400">
                {stats.busiestHour.count > 0 ? `${stats.busiestHour.count} scans` : 'No data'}
              </p>
            </div>

            <div className="bg-gray-800/50 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-red-300 mb-2">Most Invalid Scans</h3>
              <p className="text-lg font-bold text-red-400">
                {stats.mostInvalidHour.count > 0 ? stats.mostInvalidHour.hour : '--:--'}
              </p>
              <p className="text-xs text-gray-400">
                {stats.mostInvalidHour.count > 0 ? `${stats.mostInvalidHour.count} attempts` : 'No data'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}