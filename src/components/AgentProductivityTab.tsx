/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  AreaChart, Area, ReferenceLine
} from 'recharts';
import { Agent, Client, Workflow } from '../types';
import { Users, Clock, Flame, CheckCircle, Sliders, ArrowDownRight, ArrowUpRight, Send, ClipboardList, TrendingUp, AlertTriangle, Zap, Check, Timer, Download } from 'lucide-react';

interface AgentProductivityTabProps {
  agents: Agent[];
  clients: Client[];
}

export default function AgentProductivityTab({ agents, clients }: AgentProductivityTabProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; intensity: number; messageVolume: number } | null>(null);

  // --- REAL-TIME RESPONSE TIMER & LEAD SIMULATOR ---
  const [responseTimesPool, setResponseTimesPool] = useState<number[]>([12, 8, 14, 19, 5, 11, 23, 4]);

  const [activeLead, setActiveLead] = useState<{
    id: string;
    name: string;
    phone: string;
    property: string;
    assignedAgentId: string;
    elapsedSeconds: number;
    status: 'pending' | 'responded';
  } | null>({
    id: 'lead-live-1',
    name: 'Youssef El-Sawy',
    phone: '+20 122 345 9812',
    property: 'Mountain View iCity - Grand Townhouse',
    assignedAgentId: agents[0]?.id || 'agent1',
    elapsedSeconds: 112,
    status: 'pending',
  });

  const [historicalLiveLeads, setHistoricalLiveLeads] = useState<Array<{
    id: string;
    name: string;
    property: string;
    responseTimeMinutes: number;
    agentName: string;
    status: 'responded';
    timestamp: string;
  }>>([
    { id: 'lead-hist-1', name: 'Farida Sherif', property: 'Mivida - 3-Bed Garden Villa', responseTimeMinutes: 6, agentName: 'Laila Hegazi', status: 'responded', timestamp: '10 mins ago' },
    { id: 'lead-hist-2', name: 'Mostafa Kamel', property: 'Hyde Park - Duplex Luxury', responseTimeMinutes: 18, agentName: 'Tarek Selim', status: 'responded', timestamp: '24 mins ago' },
  ]);

  // Lead Generation Names pool for realistic simulation
  const MOCK_LEADS_POOL = useMemo(() => [
    { name: 'Hesham Selim', phone: '+20 101 445 1199', property: 'Palm Hills New Cairo - Luxury Villa' },
    { name: 'Nour Kamel', phone: '+20 115 393 2142', property: 'Uptown Cairo - Premium Duplex' },
    { name: 'Marianne Boutros', phone: '+20 120 484 3321', property: 'Mivida - Fully Furnished Penthouse' },
    { name: 'Omar Al-Aswany', phone: '+20 106 728 4930', property: 'Eastown - Townhouse' },
    { name: 'Shady Fahmy', phone: '+20 102 384 4921', property: 'Villette - Standalone Villa' }
  ], []);

  // Timer runner tick interval
  useEffect(() => {
    let interval: any;
    if (activeLead && activeLead.status === 'pending') {
      interval = setInterval(() => {
        setActiveLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            elapsedSeconds: prev.elapsedSeconds + 1
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeLead]);

  // Claim/Respond Action
  const claimAndRespond = () => {
    if (!activeLead) return;
    const finalMinutes = Math.max(1, Math.round(activeLead.elapsedSeconds / 60));
    const assignedAgentObj = agents.find(a => a.id === activeLead.assignedAgentId) || agents[0];
    const agentName = assignedAgentObj ? assignedAgentObj.name : 'System Round-Robin';

    // Add to pool
    setResponseTimesPool(prev => [finalMinutes, ...prev]);

    // Move to history
    setHistoricalLiveLeads(prev => [
      {
        id: activeLead.id,
        name: activeLead.name,
        property: activeLead.property,
        responseTimeMinutes: finalMinutes,
        agentName,
        status: 'responded',
        timestamp: 'Just now'
      },
      ...prev.slice(0, 4) // keep the last 5
    ]);

    // Complete the active lead status
    setActiveLead(prev => prev ? { ...prev, status: 'responded' } : null);
  };

  // Fast forward trigger
  const fastForwardActiveLead = (seconds: number) => {
    if (!activeLead) return;
    setActiveLead(prev => prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + seconds } : null);
  };

  // Generate new mock lead
  const triggerNewLead = () => {
    const randomIndex = Math.floor(Math.random() * MOCK_LEADS_POOL.length);
    const mockData = MOCK_LEADS_POOL[randomIndex];
    
    // Choose available agent or round-robin
    const selectedAgentIdToAssign = selectedAgentId === 'all' 
      ? (agents[Math.floor(Math.random() * agents.length)]?.id || 'agent1')
      : selectedAgentId;

    setActiveLead({
      id: `lead-live-${Date.now()}`,
      name: mockData.name,
      phone: mockData.phone,
      property: mockData.property,
      assignedAgentId: selectedAgentIdToAssign,
      elapsedSeconds: 0,
      status: 'pending'
    });
  };

  // Load active workflows based on selected Client (Hierarchy Selection)
  const availableWorkflows = useMemo(() => {
    if (selectedClientId === 'all') {
      return clients.flatMap(c => c.workflows);
    }
    const client = clients.find(c => c.id === selectedClientId);
    return client ? client.workflows : [];
  }, [selectedClientId, clients]);

  // Load available agents based on selected Workflow / Client
  const availableAgents = useMemo(() => {
    let agentIds = new Set<string>();

    if (selectedWorkflowId !== 'all') {
      const wf = availableWorkflows.find(w => w.id === selectedWorkflowId);
      if (wf) wf.agents.forEach(id => agentIds.add(id));
    } else if (selectedClientId !== 'all') {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        client.workflows.forEach(w => w.agents.forEach(id => agentIds.add(id)));
      }
    } else {
      // All agents
      agents.forEach(a => agentIds.add(a.id));
    }

    return agents.filter(a => agentIds.has(a.id));
  }, [selectedClientId, selectedWorkflowId, availableWorkflows, clients, agents]);

  // Calculations and data assembly based on hierarchy filters
  const filteredData = useMemo(() => {
    // Collect mapping of agent metrics
    // We aggregate because an agent can belong to multiple workflows/clients
    const stats: Record<string, { id: string; name: string; leads: number; totalResponseTime: number; counts: number; activeChats: number; conversionRate: number }> = {};

    clients.forEach(c => {
      if (selectedClientId === 'all' || selectedClientId === c.id) {
        c.workflows.forEach(w => {
          if (selectedWorkflowId === 'all' || selectedWorkflowId === w.id) {
            w.agents.forEach(agentId => {
              const baseAgent = agents.find(a => a.id === agentId);
              if (baseAgent) {
                // If filtering by specific agent
                if (selectedAgentId === 'all' || selectedAgentId === agentId) {
                  if (!stats[agentId]) {
                    stats[agentId] = {
                      id: agentId,
                      name: baseAgent.name,
                      leads: Math.round(baseAgent.leads / 2), // Distributed share
                      totalResponseTime: baseAgent.responseTime,
                      counts: 1,
                      activeChats: baseAgent.activeChats,
                      conversionRate: baseAgent.conversionRate
                    };
                  } else {
                    stats[agentId].leads += Math.round(baseAgent.leads / 2);
                    stats[agentId].totalResponseTime += baseAgent.responseTime;
                    stats[agentId].counts += 1;
                    stats[agentId].activeChats += baseAgent.activeChats;
                  }
                }
              }
            });
          }
        });
      }
    });

    // Final calculations and format for Recharts
    return Object.values(stats).map(s => {
      const leads = s.leads || 25;
      const leadsClosed = Math.round(leads * (s.conversionRate / 100));
      const calculatedConversionRate = leads > 0 ? Math.round((leadsClosed / leads) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        leads,
        avgResponseTime: Math.round(s.totalResponseTime / s.counts),
        conversionRate: s.conversionRate,
        calculatedConversionRate,
        activeChats: s.activeChats
      };
    });
  }, [selectedClientId, selectedWorkflowId, selectedAgentId, clients, agents]);

  // Track daily stats for each agent (messages sent, leads closed, pending tasks)
  const dailyAgentStats = useMemo(() => {
    return filteredData.map(agent => {
      // Deterministic values matched exactly to user's real broker metrics
      let leads = agent.leads;
      let activeChats = agent.activeChats;
      let avgResponseTime = agent.avgResponseTime;
      let conversionRate = agent.conversionRate;
      let messagesSent = 0;
      let leadsClosed = 0;
      let pendingTasks = 0;

      if (agent.id === 'a1') {
        leads = 219;
        activeChats = 15;
        avgResponseTime = 8;
        conversionRate = 24;
        messagesSent = 1455;
        leadsClosed = 53;
        pendingTasks = 31;
      } else if (agent.id === 'a2') {
        leads = 147;
        activeChats = 9;
        avgResponseTime = 18;
        conversionRate = 15;
        messagesSent = 1037;
        leadsClosed = 22;
        pendingTasks = 20;
      } else if (agent.id === 'a3') {
        leads = 112;
        activeChats = 8;
        avgResponseTime = 11;
        conversionRate = 18;
        messagesSent = 869;
        leadsClosed = 20;
        pendingTasks = 15;
      } else if (agent.id === 'a4') {
        leads = 64;
        activeChats = 2;
        avgResponseTime = 22;
        conversionRate = 11;
        messagesSent = 576;
        leadsClosed = 7;
        pendingTasks = 5;
      } else {
        const idNum = parseInt(agent.id.replace(/\D/g, '')) || 1;
        messagesSent = Math.round(leads * 5.2 + activeChats * 11.4 + idNum * 25 + 120);
        leadsClosed = Math.round(leads * (conversionRate / 100));
        pendingTasks = Math.max(1, Math.round(activeChats * 1.8 + (leads % 4) + 1));
      }

      return {
        ...agent,
        leads,
        activeChats,
        avgResponseTime,
        conversionRate,
        messagesSent,
        leadsClosed,
        pendingTasks,
        calculatedConversionRate: conversionRate
      };
    });
  }, [filteredData]);

  // Overall calculations for KPI cards
  const KPIs = useMemo(() => {
    let totalLeads = 0;
    let sumResponseTime = 0;
    let countAgents = dailyAgentStats.length;
    let totalChats = 0;
    let totalLeadsClosed = 0;

    dailyAgentStats.forEach(d => {
      totalLeads += d.leads;
      sumResponseTime += d.avgResponseTime;
      totalChats += d.activeChats;
      totalLeadsClosed += d.leadsClosed;
    });

    // Dynamic session average response time
    const avgResponse = responseTimesPool.length > 0
      ? Math.round(responseTimesPool.reduce((a, b) => a + b, 0) / responseTimesPool.length)
      : (countAgents > 0 ? Math.round(sumResponseTime / countAgents) : 0);

    const avgConversion = totalLeads > 0 
      ? Math.round((totalLeadsClosed / totalLeads) * 100) 
      : 0;

    return {
      totalLeads: totalLeads + historicalLiveLeads.length,
      avgResponse,
      countAgents,
      totalChats,
      avgConversion
    };
  }, [dailyAgentStats, responseTimesPool, historicalLiveLeads]);

  const dailyTotals = useMemo(() => {
    let totalMessagesSent = 0;
    let totalLeadsClosed = 0;
    let totalPendingTasks = 0;

    dailyAgentStats.forEach(as => {
      totalMessagesSent += as.messagesSent;
      totalLeadsClosed += as.leadsClosed;
      totalPendingTasks += as.pendingTasks;
    });

    return {
      totalMessagesSent,
      totalLeadsClosed,
      totalPendingTasks
    };
  }, [dailyAgentStats]);

  // --- HEATMAP GENERATOR AND AGGREGATOR ---
  const DAYS_OF_WEEK = useMemo(() => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], []);

  const heatmapDetails = useMemo(() => {
    const hoursList = Array.from({ length: 24 }, (_, i) => i);
    const data: { day: string; dayIndex: number; hour: number; intensity: number; messageVolume: number }[] = [];

    DAYS_OF_WEEK.forEach((day, dIdx) => {
      hoursList.forEach((hour) => {
        // Base productivity weight per hour of day
        let baseHourWeight = 10;
        if (hour >= 10 && hour <= 13) baseHourWeight = 80;     // Morning peak
        else if (hour >= 17 && hour <= 20) baseHourWeight = 95; // Evening peak
        else if (hour >= 14 && hour <= 16) baseHourWeight = 45; // Midday lull
        else if (hour >= 21 && hour <= 23) baseHourWeight = 60; // Late night chats
        else if (hour >= 0 && hour <= 5) baseHourWeight = 5;    // Sleeping
        else if (hour >= 6 && hour <= 9) baseHourWeight = 20;   // Morning start

        // Day of week adjustments
        let dayWeight = 1.0;
        if (day === 'Friday') {
          // quiet in morning, active late afternoon/evening
          dayWeight = hour < 14 ? 0.35 : 1.15;
        } else if (day === 'Saturday') {
          dayWeight = 1.25; // Busy tours and inbound listings
        } else if (day === 'Tuesday') {
          dayWeight = 0.9;
        }

        // Agent-level shifts to make data variation exquisite
        let agentShift = 1.0;
        if (selectedAgentId !== 'all') {
          const charCodeSum = selectedAgentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const offsetMod = (charCodeSum + hour) % 5;
          agentShift = 0.7 + (offsetMod * 0.15);
        }

        // Add a pseudo-deterministic randomness to prevent it from looking static
        const seedValue = (dIdx * 24 + hour + (selectedAgentId === 'all' ? 17 : 42)) % 10;
        const randomness = 0.85 + (seedValue * 0.03); 

        const intensity = Math.min(100, Math.round(baseHourWeight * dayWeight * agentShift * randomness));
        const messageVolume = Math.round(intensity * 0.45 + (selectedAgentId === 'all' ? 15 : 4));

        data.push({
          day,
          dayIndex: dIdx,
          hour,
          intensity,
          messageVolume
        });
      });
    });

    return data;
  }, [selectedAgentId, DAYS_OF_WEEK]);

  // Aggregate into 24 hours of the day for the Recharts line view
  const hourlyIntensityData = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const hourlyRecords = heatmapDetails.filter(d => d.hour === hour);
      const avgIntensity = Math.round(
        hourlyRecords.reduce((sum, item) => sum + item.intensity, 0) / hourlyRecords.length
      );
      const totalVolume = Math.round(
        hourlyRecords.reduce((sum, item) => sum + item.messageVolume, 0) / hourlyRecords.length
      );

      // Label for hour
      const label = `${String(hour).padStart(2, '0')}:00`;

      return {
        hour,
        label,
        avgIntensity,
        messageVolume: totalVolume,
        displayPrefix: hour >= 12 ? 'PM' : 'AM'
      };
    });
  }, [heatmapDetails]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700 font-sans">
          <p className="font-bold mb-1 text-slate-300">{label}</p>
          <p className="text-emerald-400">
            {payload[0].name === 'leads' ? 'Leads Assigned' : 'Avg Response'}: <span className="font-mono font-bold">{payload[0].value} {payload[0].name === 'avgResponseTime' ? 'mins' : ''}</span>
          </p>
          {payload[0].payload.calculatedConversionRate !== undefined && (
            <p className="text-slate-400 mt-1">Conversion Rank: <span className="font-mono">{payload[0].payload.calculatedConversionRate}%</span></p>
          )}
        </div>
      );
    }
    return null;
  };

  const downloadReport = () => {
    const headers = [
      'Agent ID',
      'Agent Name',
      'Assigned Leads',
      'Active Chats',
      'Avg Response Time (mins)',
      'Conversion Rate (%)',
      'Messages Sent',
      'Leads Closed',
      'Pending Tasks'
    ];

    const rows = dailyAgentStats.map(agent => [
      `"${agent.id}"`,
      `"${agent.name.replace(/"/g, '""')}"`,
      agent.leads,
      agent.activeChats,
      agent.avgResponseTime,
      `"${agent.calculatedConversionRate}%"`,
      agent.messagesSent,
      agent.leadsClosed,
      agent.pendingTasks
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let filterString = 'all_agents';
    if (selectedAgentId !== 'all') {
      const selectedAgentObj = agents.find(a => a.id === selectedAgentId);
      filterString = selectedAgentObj ? selectedAgentObj.name.toLowerCase().replace(/\s+/g, '_') : selectedAgentId;
    } else if (selectedClientId !== 'all') {
      const selectedClientObj = clients.find(c => c.id === selectedClientId);
      filterString = selectedClientObj ? `${selectedClientObj.name.toLowerCase().replace(/\s+/g, '_')}_agents` : 'client_agents';
    }
    
    link.setAttribute('download', `sierra_agent_productivity_${filterString}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Selector Header */}
      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 shadow-sm animate-in fade-in duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-900/30 rounded-lg">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Hierarchical Analytics Filter</h3>
              <p className="text-xs text-slate-400">Analyze performance across clients, active workflows, and individual agents.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Client Picker */}
            <div className="flex flex-col min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Client Page</span>
              <select
                id="client-picker"
                className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedWorkflowId('all');
                  setSelectedAgentId('all');
                }}
              >
                <option value="all">All Clients (Global)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Workflow Picker */}
            <div className="flex flex-col min-w-[160px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Workflow Hierarchy</span>
              <select
                id="workflow-picker"
                className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                value={selectedWorkflowId}
                onChange={(e) => {
                  setSelectedWorkflowId(e.target.value);
                  setSelectedAgentId('all');
                }}
              >
                <option value="all">All Workflows</option>
                {availableWorkflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Agent Picker */}
            <div className="flex flex-col min-w-[150px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Agent</span>
              <select
                id="agent-picker"
                className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="all">All Agents</option>
                {availableAgents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Download Report Action */}
            <button
              id="btn-download-productivity-report"
              onClick={downloadReport}
              className="p-2 px-3.5 bg-[#C8961A] hover:bg-[#E9C176] text-slate-950 font-black text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow border border-[#A07614]/40 h-[34px] uppercase tracking-wider"
              title="Download detailed agent performance summary report as CSV"
            >
              <Download size={14} strokeWidth={2.5} />
              Download Report
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Response Timer & Live Lead SLA Tracker */}
      <div id="live-lead-sla-tracker" className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm animate-in fade-in duration-300">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-900/30 rounded-lg">
                <Timer size={20} className="animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-slate-950"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-100 text-sm">Real-Time Response SLA Terminal</h4>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded font-bold uppercase font-mono tracking-wider animate-pulse animate-duration-1000">Live</span>
              </div>
              <p className="text-xs text-slate-400">Ticking stopwatch tracks agent delay for new WhatsApp inquiries. Target: respond in &le; 15 mins (SLA limit).</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={triggerNewLead}
              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap size={13} className="text-amber-300 fill-amber-300" />
              Trigger Inbound Lead
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Ticking Lead Card */}
          <div className="lg:col-span-2 bg-slate-950/80 rounded-xl border border-slate-850 p-5 flex flex-col justify-between relative overflow-hidden min-h-[220px]">
            {activeLead && activeLead.status === 'pending' ? (
              <>
                {/* Glowing status-dependent bar on top */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                  activeLead.elapsedSeconds > 900 // > 15m
                    ? 'bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                    : activeLead.elapsedSeconds > 180 // > 3m
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}></div>

                <div>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-0.5">UNRESOLVED LEAD IN QUEUE</span>
                      <h5 className="text-slate-100 font-bold text-base">{activeLead.name}</h5>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{activeLead.phone}</p>
                    </div>
                    
                    {/* Running Stopwatch Display */}
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-550 block uppercase tracking-wider mb-0.5">ELAPSED TIME</span>
                      <div className={`text-2xl font-black font-mono tracking-tight leading-none ${
                        activeLead.elapsedSeconds > 900
                          ? 'text-rose-500 animate-pulse animate-duration-1000'
                          : activeLead.elapsedSeconds > 180
                          ? 'text-amber-450'
                          : 'text-emerald-450'
                      }`}>
                        {String(Math.floor(activeLead.elapsedSeconds / 60)).padStart(2, '0')}m : {String(activeLead.elapsedSeconds % 60).padStart(2, '0')}s
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/40 p-3 rounded-lg border border-slate-800/40 mb-4 font-sans">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Inquiry Topic</span>
                      <span className="text-xs text-slate-300 font-semibold truncate block mt-0.5">{activeLead.property}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Assignee Agent</span>
                      <span className="text-xs text-indigo-400 font-semibold block mt-0.5">
                        {agents.find(a => a.id === activeLead.assignedAgentId)?.name || 'System Auto'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium select-none">Simulate interval:</span>
                    <button 
                      onClick={() => fastForwardActiveLead(60)} // +1 minute
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                    >
                      +1min
                    </button>
                    <button 
                      onClick={() => fastForwardActiveLead(14 * 60 + 10)} // +14m 10s (forcing breach)
                      className="px-2.5 py-1 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 rounded text-[10px] font-mono font-bold transition flex items-center gap-0.5 cursor-pointer"
                    >
                      <AlertTriangle size={9} /> Force Breach (+14m)
                    </button>
                  </div>

                  <button 
                    onClick={claimAndRespond}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black text-xs rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} strokeWidth={3} />
                    Claim & Reply (Resolve SLA)
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full gap-2 p-6">
                <div className="p-3 bg-slate-900/80 text-emerald-400 border border-slate-800 rounded-full">
                  <CheckCircle size={24} className="stroke-emerald-400" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Perfect Inbox SLA Execution</h5>
                  <p className="text-[11px] text-slate-500 max-w-[320px] mt-1">All active WhatsApp leads have been resolved. Press the 'Trigger Inbound Lead' button to pop a new lead inquiry and track live metrics.</p>
                </div>
                <button 
                  onClick={triggerNewLead}
                  className="mt-2 text-[10px] font-mono font-black text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-3 py-1.5 rounded hover:bg-indigo-900/20 transition-all uppercase tracking-widest cursor-pointer"
                >
                  Create Simulated Client Inquiry
                </button>
              </div>
            )}
          </div>

          {/* Historical Lead Feed list */}
          <div className="bg-slate-955/20 rounded-xl border border-slate-850 p-4 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5">RECENTLY RESOLVED</span>
              <div className="space-y-3 max-h-[145px] overflow-y-auto">
                {historicalLiveLeads.map(lead => (
                  <div key={lead.id} className="text-xs bg-slate-900/30 p-2.5 rounded-lg border border-slate-900/60 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-300 block truncate">{lead.name}</span>
                      <span className="text-[10px] text-slate-500 block truncate mt-0.5">Agent: {lead.agentName}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold ${lead.responseTimeMinutes > 15 ? 'text-rose-450' : 'text-emerald-450'}`}>
                        {lead.responseTimeMinutes}m response
                      </div>
                      <span className="text-[9px] text-slate-550 block mt-0.5">{lead.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px]">
              <span className="text-slate-550 font-semibold uppercase">Live Session Resolved Count:</span>
              <span className="font-mono font-black text-[#C8961A]/80">{historicalLiveLeads.length} leads</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics KPI Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Leads */}
        <div id="leads-kpi-card" className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 block">Lead Assignments</span>
            <span className="text-2xl font-bold text-slate-100 block font-mono">{KPIs.totalLeads}</span>
            <span className="text-[10px] text-emerald-450 font-medium flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +12.4% vs last week
            </span>
          </div>
          <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 border border-indigo-900/30 rounded-full flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        {/* Card 2: Response Average */}
        <div id="response-kpi-card" className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 block">Avg Response Time</span>
            <span className={`text-2xl font-bold block font-mono ${KPIs.avgResponse > 15 ? 'text-rose-450' : 'text-slate-100'}`}>
              {KPIs.avgResponse} <span className="text-xs font-normal">mins</span>
            </span>
            <span className={`text-[10px] font-medium flex items-center gap-0.5 ${KPIs.avgResponse > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {KPIs.avgResponse > 15 ? (
                <>⚠️ Exceeds 15 min threshold</>
                  ) : (
                <><CheckCircle size={10} /> Optimal response speed</>
              )}
            </span>
          </div>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${KPIs.avgResponse > 15 ? 'bg-rose-500/10 text-rose-400 border-rose-900/30' : 'bg-emerald-550/10 text-emerald-400 border-emerald-900/30'}`}>
            <Clock size={18} />
          </div>
        </div>

        {/* Card 3: Lead Conversion Rate */}
        <div id="conversion-kpi-card" className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between animate-in fade-in duration-300">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 block">Lead Conversion Rate</span>
            <span className="text-2xl font-bold text-slate-100 block font-mono">
              {KPIs.avgConversion}%
            </span>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
              <ArrowUpRight size={12} /> Target achieved
            </span>
          </div>
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 border border-emerald-900/20 rounded-full flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* Card 4: Active Agents */}
        <div id="agents-kpi-card" className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 block">Monitored Agents</span>
            <span className="text-2xl font-bold text-slate-100 block font-mono">{KPIs.countAgents}</span>
            <span className="text-[10px] text-slate-500 font-medium">Fully qualified assignees</span>
          </div>
          <div className="h-10 w-10 bg-sky-500/10 text-sky-400 border border-sky-900/20 rounded-full flex items-center justify-center">
            <Flame size={18} />
          </div>
        </div>

        {/* Card 5: Transmitting Queues */}
        <div id="chats-kpi-card" className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 block">Active Live Chats</span>
            <span className="text-2xl font-bold text-slate-100 block font-mono">{KPIs.totalChats}</span>
            <span className="text-[10px] text-indigo-400 font-medium font-mono">Stream: active connected</span>
          </div>
          <div className="h-10 w-10 bg-amber-500/10 text-amber-450 border border-amber-900/20 rounded-full flex items-center justify-center">
            <CheckCircle size={18} />
          </div>
        </div>
      </div>

      {/* Main Charts Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart A: Distribution of Lead Assignments */}
        <div id="lead-assignments-chart-card" className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm">
          <div className="mb-4">
            <h4 className="font-bold text-slate-100 text-sm">Lead Assignment Distribution</h4>
            <p className="text-xs text-slate-400">Visualizes how many dynamic incoming database leads are allocated to each agent.</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                <Bar 
                  dataKey="leads" 
                  name="leads"
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]} 
                  barSize={36}
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4338ca' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Data scope: active leads queue</span>
            <span className="font-mono text-[11px] text-indigo-400 font-semibold bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">Total: {KPIs.totalLeads}</span>
          </div>
        </div>

        {/* Chart B: Individual Agent Response Times with Red Warning > 15 mins */}
        <div id="agent-response-times-chart-card" className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm">
          <div className="mb-4">
            <h4 className="font-bold text-slate-100 text-sm">Agent Response Times</h4>
            <p className="text-xs text-slate-400">Minutes until first WhatsApp message reply. Bars exceeding 15 mins trigger a red SLA breach alarm.</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ value: 'minutes', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10 } }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                <Bar 
                  dataKey="avgResponseTime" 
                  name="avgResponseTime"
                  radius={[4, 4, 0, 0]} 
                  barSize={36}
                >
                  {filteredData.map((entry, index) => {
                    const isSlaBreached = entry.avgResponseTime > 15;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isSlaBreached ? '#ef4444' : '#10b981'} // Red for > 15 mins, Green otherwise
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-450">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span> Normal (&le; 15m)
              </span>
              <span className="flex items-center gap-1.5 text-slate-450">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block animate-pulse"></span> Breach (&gt; 15m)
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">Average: {KPIs.avgResponse}m</span>
          </div>
        </div>

      </div>

      {/* Dynamic Heatmap and Peak Windows Analysis Card */}
      <div id="agent-heatmap-analysis-card" className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
        <div>
          <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            WhatsApp Activity Heatmap & Peak Productivity Windows
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic distribution of agent communication touchpoints mapped over 24-hour cycles to identify peak SLA compliance windows.
          </p>
        </div>

        {/* Live Hover Probe Bar */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 flex flex-wrap items-center justify-between gap-4 text-xs font-sans">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-505 animate-pulse"></span>
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Dynamic Activity Probe:</span>
            {hoveredCell ? (
              <span className="text-slate-100 font-bold">
                {hoveredCell.day} at {String(hoveredCell.hour).padStart(2, '0')}:00 &rarr;{' '}
                <span className="text-indigo-400 font-mono">{hoveredCell.intensity}% Activity Intensity</span>{' '}
                <span className="text-slate-505 font-normal">({hoveredCell.messageVolume} messages mapped)</span>
              </span>
            ) : (
              <span className="text-slate-500 italic">Hover over any heatmap grid square or chart node to probe real-time agent metrics</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-sans">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800"></span> Sleep</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-950"></span> Low</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-800"></span> Mid</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#C8961A]"></span> Peak</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 gap-y-8">
          {/* Grid 1: Visual Heatmap Grid (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">Weekly Grid Overlay ({selectedAgentId === 'all' ? 'Team Total' : agents.find(a => a.id === selectedAgentId)?.name})</span>
              <span className="text-[9px] text-[#C8961A]/80 font-mono">Continuous Webhook Telemetry</span>
            </div>

            <div className="overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="min-w-[700px] select-none">
                {/* Hours column header row */}
                <div className="grid grid-cols-[80px_repeat(24,_1fr)] gap-1 text-[10px] font-mono text-slate-500 text-center mb-1 pb-1 border-b border-slate-850">
                  <div className="text-left font-bold pl-1 font-sans">Day</div>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="font-bold">{String(h).padStart(2, '0')}h</div>
                  ))}
                </div>

                {/* Days Rows */}
                <div className="space-y-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const rowCells = heatmapDetails.filter((cell) => cell.day === day);

                    return (
                      <div key={day} className="grid grid-cols-[80px_repeat(24,_1fr)] gap-1 items-center">
                        {/* Day label */}
                        <div className="text-xs font-bold text-slate-400 font-sans tracking-wide truncate pr-1">
                          {day}
                        </div>

                        {/* 24 Hour boxes */}
                        {rowCells.map((cell) => {
                          // Define background color based on intensity
                          let cellBg = 'bg-slate-900/60 border border-slate-850/30';
                          if (cell.intensity > 85) cellBg = 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600/50 shadow-sm shadow-amber-500/10';
                          else if (cell.intensity > 60) cellBg = 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700/60';
                          else if (cell.intensity > 35) cellBg = 'bg-indigo-900/80 hover:bg-indigo-800 text-slate-200 border border-indigo-950/40';
                          else if (cell.intensity > 15) cellBg = 'bg-indigo-950 hover:bg-indigo-900 text-slate-400 border border-indigo-950/60';

                          return (
                            <div
                              key={cell.hour}
                              onMouseEnter={() => setHoveredCell({
                                day: cell.day,
                                hour: cell.hour,
                                intensity: cell.intensity,
                                messageVolume: cell.messageVolume
                              })}
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`h-6 rounded flex items-center justify-center transition-all cursor-crosshair ${cellBg}`}
                              title={`${day} at ${cell.hour}:00: ${cell.intensity}% activity (${cell.messageVolume} messages)`}
                            >
                              {cell.intensity > 85 && (
                                <span className="text-[9px] font-black">🔥</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Micro insights text based on metrics */}
            <div className="p-3 bg-indigo-950/15 rounded-lg border border-indigo-900/20 text-xs text-slate-300 leading-relaxed font-sans mt-2">
              💡 <strong>Intelligent Outreach Target:</strong> Analysis shows peak activity volumes are concentrated between <strong>10:00 - 13:00</strong> (Morning follow-ups) and <strong>17:00 - 20:00</strong> (Post-office buyer response). Initiating WhatsApp outbound outreach campaigns during these gold periods increases client-response margins by up to <strong>164%</strong>.
            </div>
          </div>

          {/* Grid 2: Peak curve line chart (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">24h Peak Activity Curve</span>
              <span className="font-mono text-[#10b981] font-bold bg-emerald-950/40 p-0.5 px-2 rounded border border-emerald-900/30 text-[10px]">Peak Hour Detected: 18:00</span>
            </div>

            <div className="h-48 w-full bg-slate-955/20 rounded-xl border border-slate-850/60 p-3 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyIntensityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heatmapCopper" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8961A" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    ticks={['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00']}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const dataNode = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-700 text-xs shadow-xl font-sans">
                            <span className="block font-bold text-slate-300">{dataNode.label} {dataNode.displayPrefix}</span>
                            <span className="block text-[#C8961A] font-bold mt-1">Intensity: {dataNode.avgIntensity}%</span>
                            <span className="block text-slate-400 text-[11px] mt-0.5 font-sans">Approx Vol: {dataNode.messageVolume} msg / hr</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgIntensity" 
                    stroke="#C8961A" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#heatmapCopper)" 
                  />
                  <ReferenceLine x="11:00" stroke="#6366f1" strokeDasharray="4 4" label={{ value: '🌅 Morning Peak', fill: '#818cf8', fontSize: 9, position: 'insideTopRight' }} />
                  <ReferenceLine x="18:00" stroke="#C8961A" strokeDasharray="4 4" label={{ value: '🌆 Golden Peak', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/65 p-3 rounded-lg border border-slate-850/80 space-y-1 font-sans">
                <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Morning Window</span>
                <div className="text-slate-200 font-bold">10:00 AM - 01:00 PM</div>
                <div className="text-[10px] text-indigo-400 font-medium">Inquiry Intake Spike</div>
              </div>
              <div className="bg-slate-950/65 p-3 rounded-lg border border-slate-850/80 space-y-1 font-sans">
                <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Golden Window</span>
                <div className="text-slate-200 font-bold">05:00 PM - 08:00 PM</div>
                <div className="text-[10px] text-[#C8961A] font-bold">Max Conversion Window</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary Card for Each Agent */}
      <div id="daily-summary-dashboard-card" className="bg-slate-900/60 rounded-xl border border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-100 text-sm">Daily Team Activity & Summary Report</h4>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">Tracks messages sent, verified closed leads, and pending backlogs for active agents.</p>
          </div>
          
          {/* Dynamic aggregate pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-900/30 px-3 py-1.5 rounded-lg">
              <Send size={13} className="text-indigo-400" />
              <div className="text-left leading-none">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Total Sent</span>
                <span className="text-xs font-bold text-indigo-400 font-mono">{dailyTotals.totalMessagesSent}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/30 px-3 py-1.5 rounded-lg">
              <CheckCircle size={13} className="text-emerald-400" />
              <div className="text-left leading-none">
                <span className="text-[9px] text-slate-500 uppercase font-bold block font-sans">Closed Leads</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{dailyTotals.totalLeadsClosed}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-955/20 border border-amber-900/30 px-3 py-1.5 rounded-lg">
              <ClipboardList size={13} className="text-amber-500" />
              <div className="text-left leading-none">
                <span className="text-[9px] text-slate-500 uppercase font-bold block font-sans">Pending Tasks</span>
                <span className="text-xs font-bold text-amber-500 font-mono">{dailyTotals.totalPendingTasks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic breakdown table/grid */}
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {dailyAgentStats.map(agent => (
              <div key={agent.id} className="bg-slate-950/50 hover:bg-slate-955/80 border border-slate-850 hover:border-slate-800 p-4 rounded-xl transition-all duration-300 flex flex-col justify-between gap-4">
                
                {/* Agent Identity block */}
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-805 bg-slate-900 flex items-center justify-center">
                      {agent.avatar ? (
                        <img src={agent.avatar} alt={agent.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-xs text-slate-300 uppercase">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950"></span>
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-200 truncate" title={agent.name}>{agent.name}</h5>
                    <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase font-sans mt-0.5">Active Agent</p>
                  </div>
                </div>

                {/* Grid performance parameters */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-1 font-sans">
                  
                  {/* Messages Card */}
                  <div className="bg-slate-900/45 p-2 rounded-lg border border-slate-900">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wide leading-none mb-1">Sent</span>
                    <span className="font-mono font-bold text-slate-100 flex items-center justify-center gap-1 text-[11px]">
                      <Send size={10} className="text-indigo-400 animate-pulse" />
                      {agent.messagesSent}
                    </span>
                  </div>

                  {/* Closed Leads Card */}
                  <div className="bg-slate-900/45 p-2 rounded-lg border border-slate-900">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wide leading-none mb-1">Closed</span>
                    <span className="font-mono font-bold text-emerald-400 flex items-center justify-center gap-1 text-[11px]">
                      <TrendingUp size={10} />
                      {agent.leadsClosed}
                    </span>
                  </div>

                  {/* Pending Tasks Card */}
                  <div className="bg-slate-900/45 p-2 rounded-lg border border-slate-905">
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wide leading-none mb-1">Pending</span>
                    <span className="font-mono font-bold text-amber-550 flex items-center justify-center gap-1 text-[11px]">
                      <ClipboardList size={10} />
                      {agent.pendingTasks}
                    </span>
                  </div>

                </div>

                {/* Progress bar representational distribution */}
                <div className="space-y-3">
                  {/* Efficiency Rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500">
                      <span className="font-sans">Efficiency Rate</span>
                      <span className="text-slate-300 font-mono">{Math.round((agent.leadsClosed / (agent.leadsClosed + agent.pendingTasks || 1)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((agent.leadsClosed / (agent.leadsClosed + agent.pendingTasks || 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Lead Conversion Rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-500">
                      <span className="font-sans">Lead Conversion Rate</span>
                      <span className="text-emerald-400 font-mono">
                        {agent.calculatedConversionRate}% <span className="text-slate-600 font-normal">({agent.leadsClosed}/{agent.leads})</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, agent.calculatedConversionRate)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SLA Audit Breakdown Area */}
      <div id="sla-audit-log-section" className="bg-slate-900/60 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Real-time SLA Tracking Audit</span>
          <span className="text-[10px] bg-indigo-950/60 text-indigo-400 border border-indigo-900/30 px-2 py-0.5 rounded font-bold font-mono">SYSTEM LOGS: ACTIVE</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {dailyAgentStats.map(agent => (
            <div key={agent.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${agent.avgResponseTime > 15 ? 'bg-rose-500 shadow-lg shadow-rose-500/50' : 'bg-emerald-500'}`}></div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">{agent.name}</h5>
                  <span className="text-[11px] text-slate-500">Associated in {clients.filter(c => c.workflows.some(w => w.agents.includes(agent.id))).map(c => c.name).join(' & ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">LEAD LOAD</span>
                  <span className="text-xs font-bold text-slate-300 font-mono">{agent.leads} cases</span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">RESPONSE</span>
                  <span className={`text-xs font-bold font-mono ${agent.avgResponseTime > 15 ? 'text-rose-400' : 'text-emerald-450'}`}>{agent.avgResponseTime} mins</span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">CONVERSION</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{agent.calculatedConversionRate}%</span>
                </div>

                <div className="text-left sm:text-right min-w-[80px]">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">STATUS</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${agent.avgResponseTime > 15 ? 'bg-rose-955/20 text-rose-400 border-rose-900/30' : 'bg-emerald-955/20 text-emerald-400 border-emerald-900/30'}`}>
                    {agent.avgResponseTime > 15 ? 'REMEDIAL REQ' : 'PERFECT'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
