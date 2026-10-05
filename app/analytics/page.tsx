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
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  DoorOpen,
  RefreshCw,
  ScanLine,
  TicketCheck,
  TicketX,
  Users,
  type LucideIcon,
} from 'lucide-react';

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
        
        // Extract events with recency timestamp for sorting
        const eventItems = eventsSnapshot.docs
          .map(doc => {
            const data = doc.data() as EventData;
            let timeVal = 0;
            if (data.last_updated && typeof (data.last_updated as any).toDate === 'function') {
              timeVal = (data.last_updated as any).toDate().getTime();
            } else if (data.last_updated instanceof Date) {
              timeVal = data.last_updated.getTime();
            } else if (typeof data.last_updated === 'string') {
              timeVal = new Date(data.last_updated).getTime();
            }
            return {
              id: doc.id,
              timeVal,
            };
          })
          .filter(item => Boolean(item.id));

        // Sort events in descending order (most recent first)
        eventItems.sort((a, b) => b.timeVal - a.timeVal);
        const sortedEventIds = eventItems.map(item => item.id);

        const currentEnvEvent = (process.env.NEXT_PUBLIC_EVENT_NAME || '').replace(/^["']|["']$/g, '').trim();

        if (sortedEventIds.length > 0) {
          setEvents(['all', ...sortedEventIds]);
          // Default to the current configured event if present, otherwise the most recent event
          if (currentEnvEvent && sortedEventIds.includes(currentEnvEvent)) {
            setSelectedEvent(currentEnvEvent);
          } else {
            setSelectedEvent(sortedEventIds[0]); // Most recent event
          }
        } else {
          setEvents(['all']);
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
        // 1. Get ticket/event metadata
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
      
        // 2. Aggregate valid scans
        const validScansSnapshot = await getDocs(collection(db, `analytics/${eventId}/valid_scans`));
        validScansSnapshot.forEach(scanDoc => {
          const data = scanDoc.data() as ScanData;
          totalValidScans += Number(data.count) || 0;
        });
      
        // 3. Aggregate invalid scans
        const invalidScansSnapshot = await getDocs(collection(db, `analytics/${eventId}/invalid_scans`));
        invalidScansSnapshot.forEach(scanDoc => {
          const data = scanDoc.data() as ScanData;
          totalInvalidScans += Number(data.count) || 0;
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

  interface StatCardProps {
    title: string;
    value: string | number;
    note: string;
    icon: LucideIcon;
    color?: 'green' | 'red' | 'amber' | 'white';
  }

  const StatCard = ({ title, value, note, icon: Icon, color = 'white' }: StatCardProps) => {
    const tone = color === 'green'
      ? 'bg-emerald-500/10 text-emerald-400'
      : color === 'red'
        ? 'bg-red-500/10 text-red-400'
        : color === 'amber'
          ? 'bg-amber-500/10 text-amber-400'
          : 'bg-white/[0.06] text-zinc-300';

    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#151515] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
          </div>
          <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">{note}</p>
      </div>
    );
  };

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="pointer-events-none absolute -right-48 -top-48 h-[32rem] w-[32rem] rounded-full bg-red-600/[0.06] blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              <BarChart3 className="h-4 w-4" />
              Live reporting
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Event analytics</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
              A real-time view of arrivals, scan quality, and ticket distribution.
            </p>
          </div>

          <div className="flex w-full items-center gap-2 lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <label htmlFor="event-select" className="sr-only">Select Event</label>
              <select
                id="event-select"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#171717] px-4 pr-9 text-sm font-medium capitalize text-zinc-200 outline-none transition-colors focus:border-red-500/50 disabled:opacity-50"
                disabled={loading}
              >
                {events.map((event) => (
                  <option key={event} value={event}>
                    {event === 'all' ? 'All Events' : event.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-600">▼</span>
            </div>

            <button
              onClick={() => fetchAnalytics()}
              disabled={loading}
              className="flex h-11 flex-none items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(220,38,38,0.18)] transition-all hover:-translate-y-0.5 hover:bg-red-700 disabled:translate-y-0 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {loading && !stats.totalTickets ? (
          <div className="grid min-h-[28rem] place-items-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-red-500" />
              <p className="mt-4 text-sm font-medium text-zinc-400">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <div className="mt-7 space-y-4">
            <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#151515] p-6 sm:p-8">
                <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-red-600/10 blur-3xl" />
                <div className="relative">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Event overview</p>
                      <h2 className="mt-3 max-w-lg text-2xl font-semibold capitalize tracking-[-0.035em] text-white sm:text-3xl">
                        {selectedEvent === 'all' ? 'All events combined' : selectedEvent.replace(/_/g, ' ')}
                      </h2>
                    </div>
                    <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.08] px-3 py-1.5 text-xs font-semibold capitalize text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {stats.eventStatus}
                    </div>
                  </div>

                  <div className="mt-10 grid grid-cols-3 divide-x divide-white/[0.08]">
                    <div className="pr-3 sm:pr-6">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 sm:text-xs">Capacity</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">{Number(stats.totalTickets).toLocaleString()}</p>
                    </div>
                    <div className="px-3 sm:px-6">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 sm:text-xs">Checked in</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">{stats.validScans.toLocaleString()}</p>
                    </div>
                    <div className="pl-3 sm:pl-6">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 sm:text-xs">Remaining</p>
                      <p className={`mt-2 text-2xl font-semibold tracking-tight sm:text-4xl ${stats.notScanned > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {stats.notScanned.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Check-in progress</span>
                      <span className="font-semibold text-zinc-300">{stats.scanRate}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-red-600 transition-[width] duration-700" style={{ width: stats.scanRate }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#151515] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Last sync</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {stats.lastUpdated ? stats.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No timestamp'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {stats.lastUpdated ? stats.lastUpdated.toLocaleDateString() : 'Waiting for event data'}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-10 border-t border-white/[0.07] pt-5">
                  <p className="text-xs leading-5 text-zinc-500">Analytics automatically refresh every 15 minutes.</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total scans"
                value={stats.totalScans.toLocaleString()}
                note="All verification attempts"
                icon={ScanLine}
                color="amber"
              />
              <StatCard
                title="Invalid scans"
                value={stats.invalidScans.toLocaleString()}
                note="Rejected ticket attempts"
                icon={TicketX}
                color="red"
              />
              <StatCard
                title="Scan rate"
                value={stats.scanRate}
                note="Issued tickets checked in"
                icon={TicketCheck}
                color={parseInt(stats.scanRate) >= 80 ? 'green' : 'amber'}
              />
              <StatCard
                title="Success rate"
                value={stats.successRate}
                note="Valid scans across attempts"
                icon={CheckCircle2}
                color={parseInt(stats.successRate) >= 95 ? 'green' : 'red'}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/[0.08] bg-[#151515] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Ticket distribution</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">How guests received tickets</h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">Pre-sent</span>
                      <TicketCheck className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{Number(stats.ticketsSent)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">At the door</span>
                      <DoorOpen className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{Number(stats.atDoorTickets)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4 text-sm">
                  <span className="text-zinc-500">Total sent</span>
                  <span className="font-semibold text-white">{Number(stats.ticketsSent) + Number(stats.atDoorTickets)}</span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-[#151515] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Operational insights</p>
                <div className="mt-5 divide-y divide-white/[0.07]">
                  <div className="flex items-center justify-between gap-4 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Busiest hour</p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {stats.busiestHour.count > 0 ? `${stats.busiestHour.count} scans` : 'No data yet'}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {stats.busiestHour.count > 0 ? stats.busiestHour.hour : '--:--'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                        <TicketX className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Most invalid scans</p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          {stats.mostInvalidHour.count > 0 ? `${stats.mostInvalidHour.count} attempts` : 'No data yet'}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {stats.mostInvalidHour.count > 0 ? stats.mostInvalidHour.hour : '--:--'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
