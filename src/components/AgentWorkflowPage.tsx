/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, Agent, Workflow } from '../types';
import { 
  Plus, Users, Settings2, ShieldCheck, PlayCircle, 
  HelpCircle, UserPlus, ToggleLeft, ToggleRight, Sparkles, Building2, Workflow as WorkflowIcon
} from 'lucide-react';

interface AgentWorkflowPageProps {
  clients: Client[];
  agents: Agent[];
  onAddWorkflow: (clientId: string, workflow: Workflow) => void;
  onUpdateWorkflowStatus: (clientId: string, workflowId: string, status: Workflow['status']) => void;
  onAssignAgentToWorkflow: (clientId: string, workflowId: string, agentId: string) => void;
  onRemoveAgentFromWorkflow: (clientId: string, workflowId: string, agentId: string) => void;
  onUpdateAgentStatus: (agentId: string, status: Agent['status']) => void;
  onIncrementAgentLeads: (agentId: string) => void;
}

export default function AgentWorkflowPage({
  clients,
  agents,
  onAddWorkflow,
  onUpdateWorkflowStatus,
  onAssignAgentToWorkflow,
  onRemoveAgentFromWorkflow,
  onUpdateAgentStatus,
  onIncrementAgentLeads
}: AgentWorkflowPageProps) {
  
  // Selected client for admin page
  const [activeClientId, setActiveClientId] = useState<string>('c2'); // default to Easylisting
  
  // Form values for new Workflow creation
  const [newWorkflowName, setNewWorkflowName] = useState<string>('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState<string>('');
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState<Workflow['triggerType']>('inbound_lead');
  const [newWorkflowRouting, setNewWorkflowRouting] = useState<Workflow['routingRule']>('round_robin');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // Simulation parameters for real-time lead trigger
  const [simulatedLog, setSimulatedLog] = useState<string[]>(['Workflow System initialized.', 'Awaiting incoming inquiries...']);
  const [activeWorkflowSim, setActiveWorkflowSim] = useState<string>('w3');

  // Track next-in-sequence index for Round Robin workflows
  const [roundRobinIndexMap, setRoundRobinIndexMap] = useState<Record<string, number>>({});

  const selectedClient = clients.find(c => c.id === activeClientId) || clients[0];

  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName) return;

    const newWf: Workflow = {
      id: 'w-' + Date.now(),
      name: newWorkflowName,
      description: newWorkflowDesc || 'Custom automated workflow channel.',
      triggerType: newWorkflowTrigger,
      routingRule: newWorkflowRouting,
      agents: selectedAgentIds.length > 0 ? selectedAgentIds : ['a1'],
      status: 'active'
    };

    onAddWorkflow(activeClientId, newWf);
    
    // Reset inputs
    setNewWorkflowName('');
    setNewWorkflowDesc('');
    setSelectedAgentIds([]);
    setSimulatedLog(prev => [`New workflow "${newWf.name}" successfully integrated in hierarchy!`, ...prev]);
  };

  const handleAgentToggle = (id: string) => {
    setSelectedAgentIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Triggers simulated WhatsApp lead
  const handleSimulateLeadTrigger = () => {
    const activeWorkflow = selectedClient.workflows.find(w => w.id === activeWorkflowSim);
    if (!activeWorkflow) {
      alert('Selected workflow not found programmatically.');
      return;
    }
    if (activeWorkflow.status === 'paused') {
      setSimulatedLog(prev => [`⚠️ Aborted: Workflow "${activeWorkflow.name}" is currently paused!`, ...prev]);
      return;
    }
    if (activeWorkflow.agents.length === 0) {
      setSimulatedLog(prev => [`⚠️ Alert: No active agents assigned to "${activeWorkflow.name}" to route!`, ...prev]);
      return;
    }

    // Determine target agent based on Routing Rule
    let chosenAgent: Agent | null = null;
    let roundRobinInfoText = '';
    const assignedAgents = agents.filter(a => activeWorkflow.agents.includes(a.id));
    const onlineAgents = assignedAgents.filter(a => a.status === 'active');
    const pool = onlineAgents.length > 0 ? onlineAgents : assignedAgents; // Fallback to all assigned if none online

    if (activeWorkflow.routingRule === 'round_robin') {
      const lastIndex = roundRobinIndexMap[activeWorkflow.id] ?? 0;
      const index = lastIndex % pool.length;
      chosenAgent = pool[index];
      roundRobinInfoText = ` (Sequential Queue Pos ${index + 1}/${pool.length})`;

      // Advance sequence counter
      setRoundRobinIndexMap(prev => ({
        ...prev,
        [activeWorkflow.id]: lastIndex + 1
      }));
    } else if (activeWorkflow.routingRule === 'least_busy') {
      // Pick agent with minimum leads load
      chosenAgent = pool.reduce((prev, curr) => (prev.leads < curr.leads ? prev : curr), pool[0]);
    } else {
      // All active - Pick prime choice
      chosenAgent = pool[0];
    }

    if (chosenAgent) {
      onIncrementAgentLeads(chosenAgent.id);
      const logMsg = `📥 [${new Date().toLocaleTimeString()}] Incoming lead assigned to "${chosenAgent.name}" on workflow [${activeWorkflow.name}] using rule "${activeWorkflow.routingRule.toUpperCase()}"${roundRobinInfoText}! Incrementing lead assignments.`;
      setSimulatedLog(prev => [logMsg, ...prev]);
    }
  };

  // Helper to determine next in queue agent for display
  const getNextRoundRobinAgent = (wf: Workflow) => {
    const assignedAgents = agents.filter(a => wf.agents.includes(a.id));
    const onlineAgents = assignedAgents.filter(a => a.status === 'active');
    const pool = onlineAgents.length > 0 ? onlineAgents : assignedAgents;
    if (pool.length === 0) return null;
    const lastIndex = roundRobinIndexMap[wf.id] ?? 0;
    const index = lastIndex % pool.length;
    return pool[index];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* Selector Clients row bar */}
      <div className="lg:col-span-12 flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-850 shadow-sm">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-indigo-400" />
          <h4 className="font-bold text-slate-100 text-sm">Switch Client Tenant Configuration</h4>
        </div>
        <div className="flex gap-2">
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setActiveClientId(c.id);
                // pick first available workflow of client for simulation
                if (c.workflows.length > 0) {
                  setActiveWorkflowSim(c.workflows[0].id);
                }
              }}
              className={`p-2 px-4 text-xs font-bold rounded-lg transition-all border ${
                activeClientId === c.id 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-slate-300'
              }`}
            >
              {c.logo} {c.name} ({c.domain})
            </button>
          ))}
        </div>
      </div>

      {/* Left panel: Active workloads and dynamic workflow builders */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Dynamic Workflow List */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-850 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-slate-100 text-sm">Active Agent Workflows ({selectedClient.workflows.length})</h4>
              <p className="text-xs text-slate-400">Current active campaign pipelines and trigger configurations for {selectedClient.name}.</p>
            </div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-1 rounded-full flex items-center gap-1">
              <WorkflowIcon size={12} /> Real Estate Priority Routing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedClient.workflows.map((wf) => (
              <div key={wf.id} className="border border-slate-850 p-4 rounded-xl bg-slate-950/40 hover:bg-slate-950 transition-all flex flex-col justify-between space-y-4">
                
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-200">{wf.name}</span>
                    <button
                      onClick={() => onUpdateWorkflowStatus(selectedClient.id, wf.id, wf.status === 'active' ? 'paused' : 'active')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        wf.status === 'active'
                          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30 hover:bg-emerald-900'
                          : 'bg-rose-955/20 text-rose-450 border-rose-900/30 hover:bg-rose-900'
                      }`}
                    >
                      {wf.status === 'active' ? '● ACTIVE' : '○ PAUSED'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">{wf.description}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
                    <span>Routing Action</span>
                    <span className="text-indigo-400 font-mono font-bold bg-indigo-950/40 border border-indigo-900/30 px-1 py-0.5 rounded text-[9px]">{wf.routingRule.replace('_', ' ')}</span>
                  </div>
                  {wf.routingRule === 'round_robin' && (
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase items-center">
                      <span>Next In Queue</span>
                      {(() => {
                        const nextAgent = getNextRoundRobinAgent(wf);
                        return nextAgent ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-900/30 px-1.5 py-0.5 rounded text-[9px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0"></span>
                            <span className="truncate max-w-[80px]" title={nextAgent.name}>{nextAgent.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-550 italic text-[9px]">No Handlers</span>
                        );
                      })()}
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
                    <span>Trigger Method</span>
                    <span className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-[9px]">{wf.triggerType.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Assigned Agents chips list */}
                <div className="pt-2 border-t border-slate-850">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Assigned Lead Handlers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {wf.agents.map((agId) => {
                      const age = agents.find(a => a.id === agId);
                      if (!age) return null;
                      return (
                        <div key={agId} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 px-2 rounded-lg text-[10px] font-semibold text-slate-300">
                          <img referrerPolicy="no-referrer" src={age.avatar} className="w-3.5 h-3.5 rounded-full border border-slate-705" alt="avatar" />
                          <span>{age.name}</span>
                          <button
                            onClick={() => onRemoveAgentFromWorkflow(selectedClient.id, wf.id, agId)}
                            className="text-slate-505 hover:text-rose-400 text-[10px] px-0.5"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}

                    {/* Quick Assign Dropdown */}
                    <select
                      className="p-1 px-2 border border-dashed border-slate-800 bg-slate-900 hover:bg-slate-850 text-[9px] font-bold text-slate-400 rounded-lg outline-none cursor-pointer"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssignAgentToWorkflow(selectedClient.id, wf.id, e.target.value);
                          setSimulatedLog(prev => [`Added agent to ${wf.name} workflow queue.`, ...prev]);
                        }
                      }}
                    >
                      <option value="">+ Assign Agent</option>
                      {agents
                        .filter(a => !wf.agents.includes(a.id))
                        .map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                      }
                    </select>

                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Workflow creation form */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-850 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-855">
            <UserPlus size={16} className="text-indigo-400" />
            <h4 className="font-bold text-slate-100 text-sm">Add New Workflow Pipeline</h4>
          </div>

          <form onSubmit={handleCreateWorkflow} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Workflow Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Inbound Broker Direct Support"
                className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Description / Purpose</label>
              <input
                type="text"
                placeholder="Initial inquiries for new luxury buildings."
                className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                value={newWorkflowDesc}
                onChange={(e) => setNewWorkflowDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Trigger Event</label>
              <select
                className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={newWorkflowTrigger}
                onChange={(e) => setNewWorkflowTrigger(e.target.value as any)}
              >
                <option value="inbound_lead">Inbound Portal Form</option>
                <option value="manual_campaign">Manual Bulk Blast campaign</option>
                <option value="whatsapp_keyword">WhatsApp Word Trigger (e.g. "INFO")</option>
                <option value="property_inquiry">Detailed Property Inquiry</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Routing Allocation Engine</label>
              <select
                className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={newWorkflowRouting}
                onChange={(e) => setNewWorkflowRouting(e.target.value as any)}
              >
                <option value="round_robin">Round Robin (Sequential dispatch)</option>
                <option value="least_busy">Least Busy (Allocate to agent with minimum leads)</option>
                <option value="all_active">All Active Broad (All online handlers get notified)</option>
              </select>
            </div>

            {/* Select Multiple Agents check-bento */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-slate-505 uppercase">Select Workflow Handlers</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {agents.map(a => {
                  const isChecked = selectedAgentIds.includes(a.id);
                  return (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => handleAgentToggle(a.id)}
                      className={`p-2.5 flex items-center justify-between border rounded-lg text-xs font-semibold transition-all ${
                        isChecked 
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-305' 
                          : 'bg-slate-955 border border-slate-850 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 max-w-40 truncate">
                        <img referrerPolicy="no-referrer" src={a.avatar} className="w-4 h-4 rounded-full border border-slate-800" alt="avatar" />
                        <span className="truncate">{a.name}</span>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded border border-slate-800 bg-slate-900 flex items-center justify-center text-[10px] font-bold ${isChecked ? 'text-indigo-400' : 'text-transparent'}`}>
                        ✓
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold p-2.5 px-6 rounded-lg text-xs tracking-wide"
              >
                + Integrate New Pipeline
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Right panel: Active agents status monitors and rule routing simulator */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Real-time Agents List with switchable online/offline status */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-850 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
            <Users size={16} className="text-indigo-400" />
            <h4 className="font-bold text-slate-100 text-sm">Online Agent Handlers ({agents.length})</h4>
          </div>

          <div className="space-y-3">
            {agents.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 hover:bg-slate-950 rounded-lg border border-slate-850 transition-colors">
                <div className="flex items-center gap-2 min-w-40">
                  <div className="relative">
                    <img referrerPolicy="no-referrer" src={a.avatar} className="w-8 h-8 rounded-full border border-slate-800" alt="avatar" />
                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                      a.status === 'active' ? 'bg-emerald-500' : a.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'
                    }`}></span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200 leading-none">{a.name}</h5>
                    <span className="text-[10px] text-slate-500 leading-none block mt-1">{a.role}</span>
                  </div>
                </div>

                {/* Status Switcher pill */}
                <select
                  className="p-1 px-1.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold text-slate-300 cursor-pointer focus:outline-none"
                  value={a.status}
                  onChange={(e) => onUpdateAgentStatus(a.id, e.target.value as any)}
                >
                  <option value="active">🟢 Active</option>
                  <option value="away">🟡 Away</option>
                  <option value="offline">⚪ Offline</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation Sandbox trigger */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-850 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-indigo-400" />
            <h4 className="font-bold text-slate-100 text-sm">Lead Routing Sandbox</h4>
          </div>
          <p className="text-xs text-slate-450 leading-normal">
            Trigger a simulated WhatsApp lead to evaluate how the hierarchy rules auto-dispatch assignments.
          </p>

          <div className="space-y-2.5 text-xs">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Target Campaign Pipeline</label>
            <select
              className="w-full p-2 border border-slate-800 bg-slate-950 text-slate-200 rounded-lg font-semibold focus:outline-none"
              value={activeWorkflowSim}
              onChange={(e) => setActiveWorkflowSim(e.target.value)}
            >
              {selectedClient.workflows.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.routingRule.toUpperCase()})</option>
              ))}
            </select>

            <button
              id="simulate-lead-btn"
              onClick={handleSimulateLeadTrigger}
              className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-bold p-2.5 rounded-lg text-xs hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlayCircle size={14} /> Simulate WhatsApp Lead
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sandbox Logs</span>
            <div className="h-40 overflow-y-auto bg-slate-950 text-slate-300 p-3 rounded-lg font-mono text-[9px] space-y-2 border border-slate-850">
              {simulatedLog.map((log, index) => (
                <div key={index} className="leading-normal">{log}</div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
