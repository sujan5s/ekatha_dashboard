"use client";

import React, { useState, useEffect, useRef } from "react";

// Types for dashboard simulator
interface SystemEvent {
  id: string;
  time: string;
  service: string;
  status: "success" | "info" | "warning" | "error";
  message: string;
}

interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  color: string;
}

export default function Dashboard() {
  // State for metrics and charts
  const [selectedMetric, setSelectedMetric] = useState<"users" | "requests" | "latency" | "health">("users");
  const [activeUsers, setActiveUsers] = useState(1482);
  const [requestCount, setRequestCount] = useState(382902);
  const [avgLatency, setAvgLatency] = useState(48);
  const [healthStatus, setHealthStatus] = useState(99.98);

  // State for interactive features
  const [events, setEvents] = useState<SystemEvent[]>([
    { id: "1", time: "14:01:22", service: "AUTH", status: "success", message: "User session authenticated for token_2b9x" },
    { id: "2", time: "14:01:45", service: "DATABASE", status: "success", message: "Replica sync completed in 12ms" },
    { id: "3", time: "14:02:10", service: "GATEWAY", status: "info", message: "Rate limit threshold set to 1000 req/min for client_dev" },
    { id: "4", time: "14:02:35", service: "CACHE", status: "warning", message: "Redis memory utilization reached 78%" },
  ]);

  const [services, setServices] = useState<ServiceStatus[]>([
    { id: "auth", name: "Authentication Portal", description: "Secures server route handlers & API access", enabled: true, color: "indigo" },
    { id: "webhooks", name: "Webhook Dispatcher", description: "Triggers third-party event listeners", enabled: true, color: "cyan" },
    { id: "cache", name: "Redis Cache Sync", description: "Speeds up dashboard session state loading", enabled: false, color: "fuchsia" },
    { id: "monitor", name: "System Logging", description: "Streams diagnostic logs to log files", enabled: true, color: "emerald" },
  ]);

  const [logInput, setLogInput] = useState("");
  const [logService, setLogService] = useState("DASHBOARD");
  const [logType, setLogType] = useState<"success" | "info" | "warning" | "error">("info");
  
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Simulate incoming live traffic/events
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random fluctuations in active users and latency
      setActiveUsers((prev) => Math.max(1400, prev + Math.floor(Math.random() * 11) - 5));
      setAvgLatency((prev) => Math.max(30, prev + Math.floor(Math.random() * 7) - 3));
      setRequestCount((prev) => prev + Math.floor(Math.random() * 5) + 1);

      // Random background events (15% chance every interval)
      if (Math.random() < 0.15) {
        const mockLogTemplates = [
          { service: "DATABASE", status: "success", message: "Query optimized: SELECT * FROM users WHERE active = true" },
          { service: "GATEWAY", status: "success", message: "API route /api/v1/metrics resolved in 14ms" },
          { service: "AUTH", status: "success", message: "Token refreshed for session_92ax" },
          { service: "CACHE", status: "info", message: "Evicted 14 stale dashboard session keys" },
          { service: "SYSTEM", status: "info", message: "Memory compaction completed successfully" },
        ];
        const randomTemplate = mockLogTemplates[Math.floor(Math.random() * mockLogTemplates.length)];
        const newEvent: SystemEvent = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          service: randomTemplate.service,
          status: randomTemplate.status as any,
          message: randomTemplate.message,
        };
        setEvents((prev) => [...prev.slice(-20), newEvent]); // Keep last 20 logs
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Handle service toggle
  const toggleService = (id: string) => {
    const updatedServices = services.map((service) => {
      if (service.id === id) {
        const nextState = !service.enabled;
        // Append a system log about this action
        const newLog: SystemEvent = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          service: "SYSTEM",
          status: nextState ? "success" : "warning",
          message: `${service.name} has been ${nextState ? "ENABLED" : "DISABLED"} by Administrator.`,
        };
        setEvents((prev) => [...prev, newLog]);
        return { ...service, enabled: nextState };
      }
      return service;
    });

    setServices(updatedServices);

    // Adjust system stats dynamically based on active services
    const enabledCount = updatedServices.filter(s => s.enabled).length;
    setHealthStatus(95 + (enabledCount / updatedServices.length) * 4.99);
  };

  // Handle manual log dispatch
  const handleDispatchLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logInput.trim()) return;

    const newLog: SystemEvent = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour12: false }),
      service: logService.toUpperCase(),
      status: logType,
      message: logInput,
    };

    setEvents((prev) => [...prev, newLog]);
    setLogInput("");

    // Dynamically affect system metrics temporarily
    if (logType === "error") {
      setHealthStatus((prev) => Math.max(90, prev - 1.25));
    } else if (logType === "success") {
      setHealthStatus((prev) => Math.min(100, prev + 0.5));
    }
  };

  return (
    <div className="relative min-h-screen bg-[#07070a] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans">
      
      {/* Background Radial Glow Blobs */}
      <div className="absolute top-[-5%] left-[-15%] w-[45%] h-[45%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />

      {/* Glassmorphic Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/40 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <span className="text-lg font-black text-white tracking-wider">ड</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-tight">
                EKATHA DASHBOARD
              </span>
              <span className="text-[10px] font-semibold text-cyan-400/80 tracking-wider">SYSTEM ADMIN CENTRE</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-300">Live Connection Secure</span>
            <span className="h-4 w-px bg-slate-800" />
            <span className="text-xs text-slate-400">Region: Asia-South (Mumbai)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-slate-700/60">
              Dev Cluster
            </span>
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <section className="pt-10 pb-6">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950/80 to-slate-900/40 p-6 sm:p-8 overflow-hidden backdrop-blur-md">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">System Infrastructure Console</h1>
                <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-xl">
                  Unified analytics control center for the Ekatha stack. Real-time telemetry, routing tables, and service states powered by Next.js and Tailwind CSS v4.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 min-w-[120px]">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Avg Latency</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">{avgLatency} ms</p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 min-w-[120px]">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Uptime Rate</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{healthStatus.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Telemetry Dashboard */}
      <section className="py-6">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          
          {/* Interactive Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* Metric 1 */}
            <button
              onClick={() => setSelectedMetric("users")}
              className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                selectedMetric === "users"
                  ? "bg-slate-900/60 border-cyan-500/50 shadow-lg shadow-cyan-500/5"
                  : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/20"
              }`}
            >
              <div className="flex items-center justify-between mb-3 text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Sockets</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                  selectedMetric === "users" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}>
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{activeUsers}</p>
              <p className="text-[10px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                <span>↑ 4.2%</span> <span className="text-slate-500 font-normal">from last hour</span>
              </p>
            </button>

            {/* Metric 2 */}
            <button
              onClick={() => setSelectedMetric("requests")}
              className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                selectedMetric === "requests"
                  ? "bg-slate-900/60 border-blue-500/50 shadow-lg shadow-blue-500/5"
                  : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/20"
              }`}
            >
              <div className="flex items-center justify-between mb-3 text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Requests</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                  selectedMetric === "requests" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}>
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{requestCount.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                <span>↑ 248/sec</span> <span className="text-slate-500 font-normal">inbound load</span>
              </p>
            </button>

            {/* Metric 3 */}
            <button
              onClick={() => setSelectedMetric("latency")}
              className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                selectedMetric === "latency"
                  ? "bg-slate-900/60 border-violet-500/50 shadow-lg shadow-violet-500/5"
                  : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/20"
              }`}
            >
              <div className="flex items-center justify-between mb-3 text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Gateway Latency</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                  selectedMetric === "latency" ? "bg-violet-500/10 border-violet-500/30 text-violet-400" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}>
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{avgLatency} ms</p>
              <p className="text-[10px] text-cyan-400 font-semibold mt-1.5 flex items-center gap-1">
                <span>Optimal</span> <span className="text-slate-500 font-normal">Edge Cache routing</span>
              </p>
            </button>

            {/* Metric 4 */}
            <button
              onClick={() => setSelectedMetric("health")}
              className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                selectedMetric === "health"
                  ? "bg-slate-900/60 border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                  : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/20"
              }`}
            >
              <div className="flex items-center justify-between mb-3 text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">System Health</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                  selectedMetric === "health" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}>
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{healthStatus.toFixed(3)}%</p>
              <p className="text-[10px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                <span>Healthy</span> <span className="text-slate-500 font-normal">Active clusters operational</span>
              </p>
            </button>

          </div>

          {/* Metric Telemetry Detailed Graph Visualizer (Pure CSS & SVGs) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 mb-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Dynamic Telemetry Plot</span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedMetric === "users" && "Concurrent Sockets Activity (Last 60s)"}
                  {selectedMetric === "requests" && "Inbound HTTP Traffic Velocity (Requests/s)"}
                  {selectedMetric === "latency" && "Gateway Execution Response Profiler (ms)"}
                  {selectedMetric === "health" && "Virtual Cluster Performance Metrics"}
                </h3>
              </div>
              <div className="text-xs text-slate-500">
                Plotting live socket events from cluster `node-in-01`
              </div>
            </div>

            {/* Custom SVG Telemetry Chart */}
            <div className="h-48 w-full bg-slate-950/80 rounded-xl border border-slate-900/80 relative flex items-end p-2 overflow-hidden">
              <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Dynamically adjust plot path based on selected metric */}
                {selectedMetric === "users" && (
                  <>
                    <path d="M 0 100 Q 150 40 300 80 T 600 50 T 900 120 T 1200 40 L 1200 192 L 0 192 Z" fill="url(#chartGrad)" />
                    <path d="M 0 100 Q 150 40 300 80 T 600 50 T 900 120 T 1200 40" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
                  </>
                )}
                {selectedMetric === "requests" && (
                  <>
                    <path d="M 0 120 Q 150 90 300 130 T 600 30 T 900 60 T 1200 90 L 1200 192 L 0 192 Z" fill="url(#chartGrad)" />
                    <path d="M 0 120 Q 150 90 300 130 T 600 30 T 900 60 T 1200 90" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                  </>
                )}
                {selectedMetric === "latency" && (
                  <>
                    <path d="M 0 60 Q 150 140 300 80 T 600 150 T 900 70 T 1200 110 L 1200 192 L 0 192 Z" fill="url(#chartGrad)" />
                    <path d="M 0 60 Q 150 140 300 80 T 600 150 T 900 70 T 1200 110" fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
                  </>
                )}
                {selectedMetric === "health" && (
                  <>
                    <path d="M 0 20 Q 150 15 300 20 T 600 25 T 900 20 T 1200 18 L 1200 192 L 0 192 Z" fill="url(#chartGrad)" />
                    <path d="M 0 20 Q 150 15 300 20 T 600 25 T 900 20 T 1200 18" fill="none" stroke="#10b981" strokeWidth="2.5" />
                  </>
                )}
              </svg>
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none opacity-20">
                <div className="border-t border-slate-700 w-full" />
                <div className="border-t border-slate-700 w-full" />
                <div className="border-t border-slate-700 w-full" />
              </div>
              <div className="absolute bottom-3 left-4 flex gap-8 text-[10px] text-slate-500 uppercase font-semibold">
                <span>0s ago</span>
                <span>-20s</span>
                <span>-40s</span>
                <span>-60s</span>
              </div>
            </div>
          </div>

          {/* Grid Layout: Services Manager & System Event Logger */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Left Col (2/5): Services router panel */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 flex flex-col justify-between gap-6 backdrop-blur-md">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Service States</h4>
                  <span className="text-[10px] text-slate-500">Toggle to enable/disable</span>
                </div>
                <div className="space-y-3">
                  {services.map((svc) => (
                    <div
                      key={svc.id}
                      onClick={() => toggleService(svc.id)}
                      className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        svc.enabled
                          ? "bg-slate-900/30 border-slate-800 hover:border-slate-700"
                          : "bg-slate-950/60 border-slate-900 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1.5 h-2 w-2 rounded-full ${svc.enabled ? "bg-cyan-400 shadow-md shadow-cyan-400/20" : "bg-slate-600"}`} />
                        <div>
                          <p className={`text-sm font-semibold ${svc.enabled ? "text-slate-100" : "text-slate-500"}`}>{svc.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{svc.description}</p>
                        </div>
                      </div>
                      
                      {/* Checkbox toggle design */}
                      <div className={`w-8 h-4.5 rounded-full p-0.5 transition-all flex items-center ${
                        svc.enabled ? "bg-cyan-600 justify-end" : "bg-slate-800 justify-start"
                      }`}>
                        <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
                🚨 Webhook Dispatcher requires the background `ekatha_server` application to be initialized and running on port 8080 to trigger callback pipelines.
              </div>
            </div>

            {/* Right Col (3/5): Live system terminal logs & manual dispatcher */}
            <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 flex flex-col justify-between gap-6 backdrop-blur-md">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    Live System Terminal Stream
                  </h4>
                  <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">STDOUT</span>
                </div>

                {/* Event Logs Box */}
                <div className="bg-slate-950/80 rounded-xl border border-slate-900/80 p-4 h-60 overflow-y-auto font-mono text-xs space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {events.map((evt) => (
                    <div key={evt.id} className="flex items-start gap-2.5 leading-normal">
                      <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">[{evt.time}]</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.25 rounded shrink-0 ${
                        evt.status === "success"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : evt.status === "warning"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : evt.status === "error"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      }`}>
                        {evt.service}
                      </span>
                      <span className={
                        evt.status === "error"
                          ? "text-rose-300"
                          : evt.status === "warning"
                          ? "text-amber-300"
                          : "text-slate-300"
                      }>
                        {evt.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Log Event Dispatcher Form */}
              <form onSubmit={handleDispatchLog} className="border-t border-slate-800/60 pt-4 flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-1">
                  {/* Service selector */}
                  <select
                    value={logService}
                    onChange={(e) => setLogService(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  >
                    <option value="DASHBOARD">DASHBOARD</option>
                    <option value="DATABASE">DATABASE</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="AUTH">AUTH</option>
                  </select>

                  {/* Level selector */}
                  <select
                    value={logType}
                    onChange={(e) => setLogType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 transition-all font-mono"
                  >
                    <option value="info">INFO</option>
                    <option value="success">SUCCESS</option>
                    <option value="warning">WARN</option>
                    <option value="error">ERROR</option>
                  </select>
                </div>

                <div className="flex gap-2 flex-1 sm:flex-[2]">
                  <input
                    type="text"
                    value={logInput}
                    onChange={(e) => setLogInput(e.target.value)}
                    placeholder="Enter diagnostic log message..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl px-4 transition-colors active:scale-95 duration-100 flex items-center gap-1 shadow-md shadow-cyan-600/10"
                  >
                    <span>Dispatch</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#040406] py-12 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p>© 2026 Ekatha Administrator Node. Built with Next.js 16, TypeScript, Tailwind CSS v4.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Security Audits</span>
            <span className="hover:text-slate-300 cursor-pointer">Logs API</span>
            <span className="hover:text-slate-300 cursor-pointer">Config</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
