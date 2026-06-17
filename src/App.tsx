/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Agent, Client, Campaign, ChatThread, Workflow, Message, Recipient, PropertyClientRecord, SyncLog } from './types';
import { getStorageData, saveStorageData } from './data/initialData';
import CampaignSender from './components/CampaignSender';
import AgentWorkflowPage from './components/AgentWorkflowPage';
import AgentProductivityTab from './components/AgentProductivityTab';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import PropertyManagerTab from './components/PropertyManagerTab';
import AdminPermissionsSettings from './components/AdminPermissionsSettings';
import ExcelSpreadsheetApp from './components/ExcelSpreadsheetApp';
import { 
  Send, Users, MessageSquare, PieChart, Settings, 
  HelpCircle, CheckCircle, Database, ShieldAlert, Sparkles, Building, Lock, CloudLightning, ShieldCheck,
  GitBranch, Activity, Terminal, RefreshCw, Play, FileSpreadsheet
} from 'lucide-react';
import { db, testFirestoreConnection } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'campaigns' | 'hierarchy' | 'reports' | 'livechat' | 'settings' | 'propertymanager' | 'excel'>('reports');

  // Application database states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [propertyClients, setPropertyClients] = useState<PropertyClientRecord[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // API credentials for Settings view
  const [geminiKey, setGeminiKey] = useState<string>('***********************');
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.easylisting.co/webhooks/whatsapp');
  const [channelConnected, setChannelConnected] = useState<boolean>(true);

  // Firestore integration states
  const [firebaseConnected, setFirebaseConnected] = useState<boolean | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [firebaseSyncMessage, setFirebaseSyncMessage] = useState<string>('');

  // GitHub Actions deployment simulation states
  const [lastBuildTime, setLastBuildTime] = useState<string>(() => {
    return localStorage.getItem('wasender_last_build_time') || '2026-06-17 02:23:02 (UTC)';
  });
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'in_progress' | 'success' | 'failed'>(() => {
    return (localStorage.getItem('wasender_workflow_status') as any) || 'success';
  });
  const [buildStepsProgress, setBuildStepsProgress] = useState<{
    admin: { step: number; name: string; status: 'pending' | 'running' | 'success' | 'failed' }[];
    client: { step: number; name: string; status: 'pending' | 'running' | 'success' | 'failed' }[];
  }>({
    admin: [
      { step: 1, name: 'Checkout Repository', status: 'success' },
      { step: 2, name: 'Setup Node.js Environment', status: 'success' },
      { step: 3, name: 'Install Dependencies', status: 'success' },
      { step: 4, name: 'Compile and Build admin-site', status: 'success' },
      { step: 5, name: 'Deploy to Firebase Hosting', status: 'success' },
    ],
    client: [
      { step: 1, name: 'Checkout Repository', status: 'success' },
      { step: 2, name: 'Setup Node.js Environment', status: 'success' },
      { step: 3, name: 'Install Dependencies', status: 'success' },
      { step: 4, name: 'Compile and Build client-site', status: 'success' },
      { step: 5, name: 'Deploy to Firebase Hosting', status: 'success' },
    ]
  });
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '[System] Loaded previous deployment state of commit #416ab0',
    '[System] Env status: HEALTHY',
    '✔ sierra-blu-admin.web.app connected',
    '✔ sierra-blu.web.app connected'
  ]);

  const simulatePushDeployment = () => {
    setWorkflowStatus('in_progress');
    setConsoleLogs([
      '[System] Initializing mock GitHub Action deployment for main branch push...',
      '[System] Found 2 parallel workflows: build_and_deploy_admin & build_and_deploy_client in /.github/workflows/deploy.yml',
      'Triggered by push event on branch: main by emeraldestatesegypt@gmail.com',
      'GitHub SHA: ' + Math.random().toString(16).substring(2, 9)
    ]);

    const stepsState: {
      admin: { step: number; name: string; status: 'pending' | 'running' | 'success' | 'failed' }[];
      client: { step: number; name: string; status: 'pending' | 'running' | 'success' | 'failed' }[];
    } = {
      admin: [
        { step: 1, name: 'Checkout Repository', status: 'pending' },
        { step: 2, name: 'Setup Node.js Environment', status: 'pending' },
        { step: 3, name: 'Install Dependencies', status: 'pending' },
        { step: 4, name: 'Compile and Build admin-site', status: 'pending' },
        { step: 5, name: 'Deploy to Firebase Hosting', status: 'pending' },
      ],
      client: [
        { step: 1, name: 'Checkout Repository', status: 'pending' },
        { step: 2, name: 'Setup Node.js Environment', status: 'pending' },
        { step: 3, name: 'Install Dependencies', status: 'pending' },
        { step: 4, name: 'Compile and Build client-site', status: 'pending' },
        { step: 5, name: 'Deploy to Firebase Hosting', status: 'pending' },
      ]
    };
    setBuildStepsProgress(stepsState);

    let logs: string[] = [];
    const addLog = (msg: string) => {
      logs = [...logs, msg];
      setConsoleLogs([...logs]);
    };

    // Sequential steps
    for (let currentStep = 0; currentStep < 5; currentStep++) {
      setTimeout(() => {
        // Mark as running
        stepsState.admin[currentStep].status = 'running';
        stepsState.client[currentStep].status = 'running';
        setBuildStepsProgress({ ...stepsState });

        if (currentStep === 0) {
          addLog('[github-runner] env: ubuntu-latest spinning up container...');
          addLog('[github-runner] git checkout refs/heads/main...');
          addLog('[admin-site] Checked out successfully.');
          addLog('[client-site] Checked out successfully.');
        } else if (currentStep === 1) {
          addLog('[github-runner] setting up Node.js v20 SDK...');
          addLog('[admin-site] Cached global bundle config updated.');
          addLog('[client-site] Packages restored from dependency lockfile.');
        } else if (currentStep === 2) {
          addLog('[admin-site] Running: npm ci (installing cleanly)...');
          addLog('[client-site] Running: npm ci (installing cleanly)...');
          addLog('[admin-site] npm ci added 962 packages in 1.4s.');
          addLog('[client-site] npm ci added 1024 packages in 1.6s.');
        } else if (currentStep === 3) {
          addLog('[admin-site] Running compile build: vite build --mode production...');
          addLog('[client-site] Running compile build: vite build --mode production...');
          addLog('[admin-site] output chunk generated assets: dist/assets/index-9a00fb.js');
          addLog('[client-site] output chunk generated assets: dist/assets/main-018fbf.js');
        } else if (currentStep === 4) {
          addLog('[admin-site] Deploying to Firebase Hosting using credentials...');
          addLog('[client-site] Deploying to Firebase Hosting using credentials...');
          addLog('[Firebase] ✔ admin-site successfully routed to: https://sierra-blu.web.app/admin');
          addLog('[Firebase] ✔ client-site successfully routed to: https://sierra-blu.web.app');
        }
      }, currentStep * 1600);

      setTimeout(() => {
        // Mark as success
        stepsState.admin[currentStep].status = 'success';
        stepsState.client[currentStep].status = 'success';
        setBuildStepsProgress({ ...stepsState });

        if (currentStep === 4) {
          setWorkflowStatus('success');
          const timeLabel = new Date().toLocaleString() + ' (Local Container Time)';
          setLastBuildTime(timeLabel);
          localStorage.setItem('wasender_last_build_time', timeLabel);
          localStorage.setItem('wasender_workflow_status', 'success');
          addLog('[GitHub Actions] Deployment COMPLETED! All checks passed, hosting revision active. 🎉');
        }
      }, currentStep * 1600 + 1300);
    }
  };

  // Load state from localStorage on boot
  useEffect(() => {
    const data = getStorageData();
    setAgents(data.agents);
    setClients(data.clients);
    setCampaigns(data.campaigns);
    setChats(data.chats);
    setPropertyClients((data as any).propertyClients || []);
    setSyncLogs((data as any).syncLogs || []);

    // Test the live Firestore connection is online
    testFirestoreConnection().then(status => {
      setFirebaseConnected(status);
    });
  }, []);

  const syncToFirestore = async (updated: {
    agents?: Agent[];
    propertyClients?: PropertyClientRecord[];
    syncLogs?: SyncLog[];
  }) => {
    try {
      if (updated.agents) {
        for (const agent of updated.agents) {
          await setDoc(doc(db, 'agents', agent.id), agent);
        }
      }
      if (updated.propertyClients) {
        for (const pClient of updated.propertyClients) {
          await setDoc(doc(db, 'property_clients', pClient.id), pClient);
        }
      }
      if (updated.syncLogs) {
        for (const log of updated.syncLogs) {
          await setDoc(doc(db, 'sync_logs', log.id), log);
        }
      }
    } catch (e) {
      console.warn("Background Firestore sync not fully updated (possibly due to rule permissions):", e);
    }
  };

  // Save to persistence whenever state modifies
  const persist = (updated: {
    agents?: Agent[];
    clients?: Client[];
    campaigns?: Campaign[];
    chats?: ChatThread[];
    propertyClients?: PropertyClientRecord[];
    syncLogs?: SyncLog[];
  }) => {
    saveStorageData(updated);
    if (updated.agents) {
      setAgents(updated.agents);
      syncToFirestore({ agents: updated.agents });
    }
    if (updated.clients) setClients(updated.clients);
    if (updated.campaigns) setCampaigns(updated.campaigns);
    if (updated.chats) setChats(updated.chats);
    if (updated.propertyClients) {
      setPropertyClients(updated.propertyClients);
      syncToFirestore({ propertyClients: updated.propertyClients });
    }
    if (updated.syncLogs) {
      setSyncLogs(updated.syncLogs);
      syncToFirestore({ syncLogs: updated.syncLogs });
    }
  };

  const handleBulkFirestoreSync = async () => {
    setIsSyncingFirebase(true);
    setFirebaseSyncMessage('Initiating Master Sync to sierra-blu...');
    try {
      let count = 0;
      for (const pClient of propertyClients) {
        await setDoc(doc(db, 'property_clients', pClient.id), pClient);
        count++;
      }
      for (const agent of agents) {
        await setDoc(doc(db, 'agents', agent.id), agent);
      }
      for (const log of syncLogs) {
        await setDoc(doc(db, 'sync_logs', log.id), log);
      }
      setFirebaseSyncMessage(`Master Sync Complete! Synced ${count} client leads and agents into the sierra-blu database.`);
    } catch (e: any) {
      console.warn(e);
      setFirebaseSyncMessage(`Sync partially complete (local copy saved). Rules or network details: ${e?.message || e}`);
    } finally {
      setIsSyncingFirebase(false);
      setTimeout(() => setFirebaseSyncMessage(''), 6050);
    }
  };

  const getPermission = (sectionId: string) => {
    const savedRoles = localStorage.getItem('wasender_admin_roles');
    const activeTest = localStorage.getItem('wasender_active_test_role') || 'role-super-admin';
    if (!savedRoles) return 'Manager';
    try {
      const roles = JSON.parse(savedRoles);
      const simulated = roles.find((r: any) => r.id === activeTest);
      if (!simulated) return 'Manager';
      const perm = simulated.permissions.find((p: any) => p.sectionId === sectionId);
      return perm ? perm.access : 'Manager';
    } catch (e) {
      return 'Manager';
    }
  };

  // State manipulation handlers
  const handleAddCampaign = (camp: Campaign) => {
    const next = [camp, ...campaigns];
    persist({ campaigns: next });
  };

  const handleUpdateCampaignStatus = (
    id: string, 
    status: Campaign['status'], 
    sentCount: number, 
    failedCount: number, 
    recipients: Recipient[]
  ) => {
    const next = campaigns.map(c => 
      c.id === id ? { ...c, status, sentCount, failedCount, recipients } : c
    );
    persist({ campaigns: next });
  };

  const handleAddWorkflow = (clientId: string, workflow: Workflow) => {
    const next = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          workflows: [...client.workflows, workflow]
        };
      }
      return client;
    });
    persist({ clients: next });
  };

  const handleUpdateWorkflowStatus = (clientId: string, workflowId: string, status: Workflow['status']) => {
    const next = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          workflows: client.workflows.map(w => 
            w.id === workflowId ? { ...w, status } : w
          )
        };
      }
      return client;
    });
    persist({ clients: next });
  };

  const handleAssignAgentToWorkflow = (clientId: string, workflowId: string, agentId: string) => {
    const next = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          workflows: client.workflows.map(w => {
            if (w.id === workflowId) {
              if (!w.agents.includes(agentId)) {
                return { ...w, agents: [...w.agents, agentId] };
              }
            }
            return w;
          })
        };
      }
      return client;
    });
    persist({ clients: next });
  };

  const handleRemoveAgentFromWorkflow = (clientId: string, workflowId: string, agentId: string) => {
    const next = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          workflows: client.workflows.map(w => {
            if (w.id === workflowId) {
              return { ...w, agents: w.agents.filter(id => id !== agentId) };
            }
            return w;
          })
        };
      }
      return client;
    });
    persist({ clients: next });
  };

  const handleUpdateAgentStatus = (agentId: string, status: Agent['status']) => {
    const next = agents.map(a => 
      a.id === agentId ? { ...a, status } : a
    );
    persist({ agents: next });
  };

  const handleIncrementAgentLeads = (agentId: string) => {
    const next = agents.map(a => 
      a.id === agentId ? { ...a, leads: a.leads + 1 } : a
    );
    persist({ agents: next });
  };

  const handleMapIncomingNumber = (phone: string, customerName: string, lastMsgText: string) => {
    if (!phone) return;
    
    // Normalize phone numbers for flexible mapping (digits only, match last 8 digits)
    const normalize = (num: string) => num.replace(/\D/g, '');
    const normPhone = normalize(phone);
    if (!normPhone) return;

    let isMatched = false;
    let matchName = '';
    let logStatus: 'Matched & Updated' | 'New Lead Synced' = 'New Lead Synced';
    let logDetails = '';

    const nextClients = propertyClients.map(client => {
      const normClientPhone = normalize(client.phone);
      const match = normClientPhone && (
        normClientPhone.endsWith(normPhone) || 
        normPhone.endsWith(normClientPhone) ||
        normClientPhone === normPhone
      );
      
      if (match) {
        isMatched = true;
        matchName = client.name;
        logStatus = 'Matched & Updated';
        let newStatus = client.status;
        if (client.status === 'New Lead') {
          newStatus = 'WhatsApp Contacted';
        }
        logDetails = `Matched contact. Status set to "${newStatus}". Inbound WhatsApp text: "${lastMsgText.substring(0, 30)}${lastMsgText.length > 30 ? '...' : ''}"`;
        return {
          ...client,
          status: newStatus as any,
          lastActivity: `Last message: "${lastMsgText.substring(0, 40)}${lastMsgText.length > 40 ? '...' : ''}"`,
          updatedAt: new Date().toLocaleString()
        };
      }
      return client;
    });

    let finalClients = nextClients;
    if (!isMatched) {
      const newRecord: PropertyClientRecord = {
        id: 'pc-' + Date.now(),
        name: customerName || 'Unknown Lead',
        phone: phone,
        propertyInterest: 'General Compound Inquiry',
        status: 'WhatsApp Contacted',
        lastActivity: `Chat Initiated: "${lastMsgText.substring(0, 40)}${lastMsgText.length > 40 ? '...' : ''}"`,
        updatedAt: new Date().toLocaleString(),
        notes: 'Lead automatically synced from WhatsApp simulator inbound request.'
      };
      finalClients = [newRecord, ...propertyClients];
      matchName = newRecord.name;
      logStatus = 'New Lead Synced';
      logDetails = `Created new lead "${newRecord.name}" automatically from incoming WhatsApp inquiry.`;
    }

    const newLog: SyncLog = {
      id: 'slog-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      phone: phone,
      name: matchName,
      status: logStatus,
      details: logDetails
    };
    const finalLogs = [newLog, ...syncLogs];

    persist({ propertyClients: finalClients, syncLogs: finalLogs });
  };

  const handleSendMessage = (chatId: string, text: string, sender: Message['sender'], senderName: string) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: 'msg-' + Date.now(),
      chatId,
      sender,
      senderName,
      text,
      timestamp: timeString,
      status: 'sent'
    };

    const nextChats = chats.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          lastMessageText: text,
          lastMessageTime: timeString,
          unreadCount: sender === 'customer' ? chat.unreadCount + 1 : 0,
          messages: [...chat.messages, newMsg]
        };
      }
      return chat;
    });

    persist({ chats: nextChats });

    // Look up parent chat details and trigger auto-mapping real estate service
    const targetChat = chats.find(c => c.id === chatId);
    if (targetChat) {
      handleMapIncomingNumber(targetChat.customerPhone, targetChat.customerName, text);
    }
  };

  const renderRestrictedMessage = (sectionName: string) => (
    <div id="restriction-gate" className="bg-slate-900/40 p-12 py-16 text-center rounded-xl border border-rose-950/25 shadow-md flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
      <div className="p-4 bg-rose-950/30 text-rose-400 border border-rose-900/40 rounded-full animate-bounce">
        <Lock size={32} />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h4 className="text-sm font-bold text-slate-150 uppercase tracking-widest font-sans">Access Restricted</h4>
        <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
          Your current simulated organization credentials do not grant active clearance to view the <strong className="text-slate-200">{sectionName}</strong> module.
        </p>
      </div>
      <div className="pt-2">
        <button 
          onClick={() => setActiveTab('settings')}
          className="text-[11px] font-bold bg-[#C8961A]/10 text-[#C8961A] hover:bg-[#C8961A]/20 border border-[#C8961A]/30 p-1.5 px-4 rounded-lg cursor-pointer transition-all"
        >
          Adjust Testing Role in Settings
        </button>
      </div>
    </div>
  );

  const renderViewerBanner = (sectionName: string) => (
    <div className="bg-blue-950/20 text-blue-400 border border-blue-900/30 p-3 rounded-lg text-xs flex items-center justify-between gap-2 mb-4 font-sans border-dashed">
      <div className="flex items-center gap-2">
        <ShieldAlert size={14} className="text-blue-400" />
        <span><strong>Simulated Viewer Mode Active:</strong> Direct write limits in position. Modifying operations on {sectionName} are restricted.</span>
      </div>
      <span className="text-[9px] font-mono font-black uppercase text-blue-300 tracking-wider">READ_ONLY</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 antialiased overflow-hidden">
      
      {/* 1. Sleek Left Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800 shadow-2xl relative z-20">
        
        {/* Top Header Logo */}
        <div className="space-y-6">
          <div className="p-6 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-[#C8961A] to-[#E9C176] p-2 rounded-xl text-slate-950 shadow-lg shadow-amber-500/10">
                <Building size={18} />
              </div>
              <div>
                <h1 className="text-xs font-black tracking-tight text-[#E9C176] uppercase block leading-none font-mono">Sierra Estates 3.0</h1>
                <span className="text-[9px] text-slate-550 font-bold tracking-wider uppercase block mt-1">Intelligence OS</span>
              </div>
            </div>
          </div>

          {/* Navigation Items (Side list) */}
          <nav className="px-3 space-y-1.5">
            
            {/* Reports Analytics */}
            <button
              id="sidebar-nav-reports"
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'reports'
                  ? 'bg-[rgba(200,150,26,0.13)] text-[#E9C176] shadow-sm'
                  : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <PieChart size={16} className={activeTab === 'reports' ? 'text-[#E9C176]' : 'text-slate-500'} />
                <span>Agent Productivity</span>
              </div>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-black border transition-colors ${
                activeTab === 'reports' ? 'bg-[#C8961A]/20 text-[#E9C176] border-[#C8961A]/30' : 'bg-slate-850 text-slate-500 border-slate-800'
              }`}>REPORTS</span>
            </button>

            {/* Bulk Campaigns */}
            <button
              id="sidebar-nav-campaigns"
              onClick={() => setActiveTab('campaigns')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-[rgba(200,150,26,0.13)] text-[#E9C176] shadow-sm'
                  : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Send size={16} className={activeTab === 'campaigns' ? 'text-[#E9C176]' : 'text-slate-500'} />
                <span>Bulk Message Sender</span>
              </div>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-black border transition-colors ${
                activeTab === 'campaigns' ? 'bg-[#C8961A]/20 text-[#E9C176] border-[#C8961A]/30' : 'bg-slate-850 text-slate-500 border-slate-800'
              }`}>WA BLAST</span>
            </button>

            {/* Hierarchies workflows */}
            <button
              id="sidebar-nav-hierarchy"
              onClick={() => setActiveTab('hierarchy')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'hierarchy'
                  ? 'bg-[rgba(200,150,26,0.13)] text-[#E9C176] shadow-sm'
                  : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} className={activeTab === 'hierarchy' ? 'text-[#E9C176]' : 'text-slate-500'} />
                <span>Workflow Hierarchy</span>
              </div>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-black border transition-colors ${
                activeTab === 'hierarchy' ? 'bg-[#C8961A]/20 text-[#E9C176] border-[#C8961A]/30' : 'bg-slate-850 text-slate-500 border-slate-800'
              }`}>FLOWS</span>
            </button>

            {/* Chat Inbox */}
            <button
              id="sidebar-nav-livechat"
              onClick={() => setActiveTab('livechat')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'livechat'
                  ? 'bg-[rgba(200,150,26,0.13)] text-[#E9C176] shadow-sm'
                  : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={16} className={activeTab === 'livechat' ? 'text-[#E9C176]' : 'text-slate-500'} />
                <span>Simulated WA Web</span>
              </div>
              {chats.some(c => c.unreadCount > 0) ? (
                <span className="bg-rose-500/20 text-rose-400 font-mono text-[9px] px-2 py-0.5 rounded font-bold border border-rose-500/30">NEW</span>
              ) : (
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-black border transition-colors ${
                  activeTab === 'livechat' ? 'bg-[#C8961A]/20 text-[#E9C176] border-[#C8961A]/30' : 'bg-slate-850 text-slate-500 border-slate-800'
                }`}>CHAT</span>
              )}
            </button>

            {/* Settings */}
            <button
              id="sidebar-nav-settings"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'settings'
                  ? 'bg-[rgba(200,150,26,0.13)] text-[#E9C176] shadow-sm'
                  : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings size={16} className={activeTab === 'settings' ? 'text-[#E9C176]' : 'text-slate-500'} />
                <span>Meta API Settings</span>
              </div>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-black border transition-colors ${
                activeTab === 'settings' ? 'bg-[#C8961A]/20 text-[#E9C176] border-[#C8961A]/30' : 'bg-slate-850 text-slate-500 border-slate-800'
              }`}>CONFIG</span>
            </button>

            {/* Property Code Terminal react button */}
            <button
              id="sidebar-nav-propertymanager"
              onClick={() => setActiveTab('propertymanager')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'propertymanager'
                  ? 'bg-[rgba(200,150,26,0.13)] text-[#E9C176] shadow-sm'
                  : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building size={16} className={activeTab === 'propertymanager' ? 'text-[#E9C176]' : 'text-slate-500'} />
                <span>Property Code Terminal</span>
              </div>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-black border transition-colors ${
                activeTab === 'propertymanager' ? 'bg-[#C8961A]/20 text-[#E9C176] border-[#C8961A]/30' : 'bg-slate-850 text-slate-500 border-slate-800'
              }`}>TERM</span>
            </button>

            {/* Interactive Spreadsheet Tab */}
            <button
              id="sidebar-nav-excel"
              onClick={() => setActiveTab('excel')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'excel'
                  ? 'bg-[rgba(200,150,26,0.13)] text-[#E9C176] shadow-sm'
                  : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={16} className={activeTab === 'excel' ? 'text-[#E9C176]' : 'text-slate-500'} />
                <span>Excel Sheets & CRM</span>
              </div>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-black border transition-colors ${
                activeTab === 'excel' ? 'bg-[#C8961A]/20 text-[#E9C176] border-[#C8961A]/30' : 'bg-slate-850 text-slate-505 border-slate-800'
              }`}>XLSX</span>
            </button>

            {/* Sierra 3.0 Platform Views */}
            <div className="pt-4 pb-1">
              <span className="text-[9px] text-slate-550 font-black tracking-widest pl-4 uppercase">Sierra 3.0 Portal</span>
            </div>

            <a
              href="Sierra Estates 3.0 Client Hub.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all text-amber-400 hover:text-amber-200 hover:bg-amber-950/20 border border-amber-900/30 bg-amber-950/10"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={16} className="text-amber-400 animate-pulse" />
                <span>Client Hub 3.0</span>
              </div>
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[8px] px-1.5 py-0.5 rounded font-black border border-amber-500/30">CLIENT</span>
            </a>

            <a
              href="Sierra Estates 3.0 Admin Portal.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all text-amber-400 hover:text-amber-200 hover:bg-amber-950/20 border border-amber-900/30 bg-amber-950/10"
            >
              <div className="flex items-center gap-3">
                <Building size={16} className="text-amber-400" />
                <span>Admin Portal 3.0</span>
              </div>
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[8px] px-1.5 py-0.5 rounded font-black border border-amber-500/30">ADMIN</span>
            </a>

            <a
              href="Sierra Estates 3.0 Property Manager.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all text-amber-400 hover:text-amber-200 hover:bg-amber-950/20 border border-amber-900/30 bg-amber-950/10"
            >
              <div className="flex items-center gap-3">
                <Building size={16} className="text-amber-400 animate-pulse" />
                <span>RTL Code Manager 3.0</span>
              </div>
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[8px] px-1.5 py-0.5 rounded font-black border border-amber-500/30">MGR 3.0</span>
            </a>

          </nav>
        </div>

        {/* Bottom Workspace footer */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2 bg-slate-850 rounded-lg border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="font-semibold text-slate-300 uppercase">WhatsApp API Connected</span>
          </div>
          <p className="leading-snug text-slate-650">Local Sandbox preservation. Designed for Real Estate Leads.</p>
        </div>

      </div>

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 bg-slate-950/50 border-b border-slate-800 shrink-0 px-8 flex items-center justify-between relative z-10 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
            <span>Sierra Estates</span>
            <span className="opacity-30">/</span>
            <span>Reports</span>
            <span className="opacity-30">/</span>
            <span className="text-slate-100 font-bold">
              {activeTab === 'reports' && 'Agent Productivity'}
              {activeTab === 'campaigns' && 'Bulk WASender'}
              {activeTab === 'hierarchy' && 'Workflow pipelines'}
              {activeTab === 'livechat' && 'Live Inboxes'}
              {activeTab === 'settings' && 'Meta Cloud API Credentials'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Client</p>
              <p className="text-xs font-semibold text-slate-300">Easylisting Hub</p>
            </div>
            <div className="h-7 w-px bg-slate-800"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">AF</div>
              <span className="text-[11px] font-bold text-slate-300 hidden sm:inline-block">Ahmed Fawzy</span>
            </div>
          </div>
        </header>

        {/* Primary Page Content Wrapper */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Active Route Rendering */}
          {activeTab === 'reports' && (
            <div className="animate-in fade-in duration-300">
              {getPermission('reports') === 'No Access' ? (
                renderRestrictedMessage('Agent Productivity Tab')
              ) : (
                <>
                  {getPermission('reports') === 'Viewer' && renderViewerBanner('Agent Productivity Tab')}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-slate-100">Agent Productivity Tab</h3>
                      <p className="text-xs text-slate-400 mt-0.5 animate-pulse">Distribution of property lead allocations and individual WhatsApp agent response speeds.</p>
                    </div>
                  </div>
                  <AgentProductivityTab agents={agents} clients={clients} />
                </>
              )}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="animate-in fade-in duration-300">
              {getPermission('campaigns') === 'No Access' ? (
                renderRestrictedMessage('Bulk Message Sender')
              ) : (
                <>
                  {getPermission('campaigns') === 'Viewer' && renderViewerBanner('Bulk Message Sender')}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold tracking-tight text-slate-100">WASender Bulk Message Engine</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">Craft templates featuring customized placeholder variables, load Excel lists, and execute safety blasts.</p>
                  </div>
                  <CampaignSender 
                    campaigns={campaigns}
                    onAddCampaign={handleAddCampaign}
                    onUpdateCampaignStatus={handleUpdateCampaignStatus}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'hierarchy' && (
            <div className="animate-in fade-in duration-300">
              {getPermission('hierarchy') === 'No Access' ? (
                renderRestrictedMessage('Workflow & Agent Hierarchy')
              ) : (
                <>
                  {getPermission('hierarchy') === 'Viewer' && renderViewerBanner('Workflow & Agent Hierarchy')}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold tracking-tight text-slate-100">Workflow & Agent Hierarchy Page</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Add custom client workloads, bind team channels, and allocate trigger-based sequentially routed leads.</p>
                  </div>
                  <AgentWorkflowPage 
                    clients={clients}
                    agents={agents}
                    onAddWorkflow={handleAddWorkflow}
                    onUpdateWorkflowStatus={handleUpdateWorkflowStatus}
                    onAssignAgentToWorkflow={handleAssignAgentToWorkflow}
                    onRemoveAgentFromWorkflow={handleRemoveAgentFromWorkflow}
                    onUpdateAgentStatus={handleUpdateAgentStatus}
                    onIncrementAgentLeads={handleIncrementAgentLeads}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'livechat' && (
            <div className="animate-in fade-in duration-300">
              {getPermission('livechat') === 'No Access' ? (
                renderRestrictedMessage('Simulated WA Sandbox')
              ) : (
                <>
                  {getPermission('livechat') === 'Viewer' && renderViewerBanner('Simulated WA Sandbox')}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold tracking-tight text-slate-100">WhatsApp Simulated Web</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Live conversation sandbox with autoresponder triggers to test immediate feedback flows.</p>
                  </div>
                  <WhatsAppSimulator 
                    chats={chats}
                    agents={agents}
                    onSendMessage={handleSendMessage}
                    onSelectChat={(chat) => handleMapIncomingNumber(chat.customerPhone, chat.customerName, chat.lastMessageText)}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              {getPermission('settings') === 'No Access' ? (
                renderRestrictedMessage('Meta API Credentials')
              ) : (
                <>
                  {getPermission('settings') === 'Viewer' && renderViewerBanner('Meta API Credentials')}

                  {/* GitHub Actions Live Deployment Pipeline Status Banner */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-650 border border-indigo-100 rounded text-[9px] font-bold tracking-wider uppercase font-mono">
                            GitHub CI/CD
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <GitBranch size={13} className="text-slate-400" />
                            branch: <strong className="text-slate-700 font-mono">main</strong>
                          </span>
                        </div>
                        <h3 className="text-md font-bold tracking-tight text-slate-900 flex items-center gap-2 mt-1">
                          <Activity size={16} className="text-indigo-600" />
                          Firebase Hosting Deployment Status
                        </h3>
                        <p className="text-xs text-slate-500">
                          Automated multi-site synchronization pipeline for live domains.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Deployment Status</span>
                          <span className="text-xs font-mono font-bold mt-0.5 flex items-center gap-1.5">
                            {workflowStatus === 'in_progress' ? (
                              <span className="text-amber-500 flex items-center gap-1.5 font-bold uppercase animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                Syncing...
                              </span>
                            ) : workflowStatus === 'success' ? (
                              <span className="text-emerald-600 flex items-center gap-1.5 font-bold uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Live / Succeeded
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-1.5 font-bold uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Idle State
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Last Synced Epoch</span>
                          <span className="text-xs font-mono font-medium text-slate-700 mt-0.5 whitespace-nowrap">
                            {lastBuildTime}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={workflowStatus === 'in_progress' || getPermission('settings') === 'Viewer'}
                          onClick={simulatePushDeployment}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 text-xs font-bold p-2 px-3.5 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          {workflowStatus === 'in_progress' ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              Compiling...
                            </>
                          ) : (
                            <>
                              <Play size={13} className="fill-current" />
                              Trigger Deploy
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Highly compressed single terminal log status bar instead of massive code block terminal */}
                    {workflowStatus === 'in_progress' && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs font-mono text-indigo-600 animate-pulse">
                        <div className="flex items-center gap-2">
                          <Terminal size={12} />
                          <span>[Pipeline Active]: {consoleLogs[consoleLogs.length - 1] || 'Processing build sequence...'}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase">Live CLI</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-slate-900 font-sans font-sans">Meta API & Credentials</h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-sans">Customize environment bindings, webhook endlines, and anti-ban safeguards.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-sans">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Process secret Gemini API Key (Server Only)</label>
                        <input
                          type="password"
                          disabled={getPermission('settings') === 'Viewer'}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-750 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-40"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                        />
                        <span className="text-[9px] text-slate-400 block pb-1">Required to generate high conversion campaign copy. Configured via Secrets Panel.</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp Inbound Webhook Endpoint</label>
                        <input
                          type="text"
                          disabled={getPermission('settings') === 'Viewer'}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-750 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-40"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                        />
                        <span className="text-[9px] text-slate-400 block pb-1 font-sans">Incoming Meta Cloud API webhook triggers our routing rules list.</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
                      <div className="flex gap-3 items-center">
                        <div className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg"><Database size={16} /></div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 mb-0.5">Active Webhook Verification Challenge Token</h5>
                          <p className="text-[10px] text-slate-500">挑战Token: <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-100 rounded text-slate-700">easylisting_production_challenge_uY7v9</span></p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={getPermission('settings') === 'Viewer'}
                        onClick={() => {
                          setChannelConnected(prev => !prev);
                          alert(channelConnected ? 'Disconnection requested.' : 'Simulated Meta API channel successfully connected!');
                        }}
                        className={`text-[11px] font-bold p-1.5 px-4 rounded-lg transition-all disabled:opacity-45 cursor-pointer ${
                          channelConnected 
                            ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                            : 'bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-500'
                        }`}
                      >
                        {channelConnected ? 'Disconnect Node' : 'Initialize WhatsApp API'}
                      </button>
                    </div>
                  </div>

                  {/* Production Firebase Database Sync Block */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2 font-sans">
                          <CloudLightning size={20} className="text-indigo-650" />
                          Sierra Estates Core Firestore Portal
                        </h3>
                        <p className="text-xs text-slate-550 mt-0.5 text-slate-500 font-sans">Manage live connection states, credential verification, and property database synchronization.</p>
                      </div>
                      
                      <div className="flex items-center gap-2 font-sans">
                        <span className="text-[10px] text-slate-400 font-mono">Status:</span>
                        {firebaseConnected === null ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            VERIFYING
                          </span>
                        ) : firebaseConnected ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            CONNECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-50 text-slate-600 border border-slate-205 border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            SANDBOX / OFFLINE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connection details & Active SDK credentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-205 border-slate-200 font-sans">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Active Database Project</span>
                        <span className="text-xs font-mono font-medium text-slate-700 block">sierra-blu (Firestore)</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Auth Host Domain</span>
                        <span className="text-xs font-mono font-medium text-slate-700 block">sierra-blu.firebaseapp.com</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/85 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 block">Database Synchronization</span>
                        <p className="text-[10px] text-slate-550 text-slate-500 leading-relaxed">
                          Securely align local agent records and WhatsApp lead status metadata across Firestore collections.
                        </p>
                        {firebaseSyncMessage && (
                          <p className="text-[11px] font-semibold text-amber-600 animate-pulse pt-1 font-mono">
                            {firebaseSyncMessage}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleBulkFirestoreSync}
                        disabled={isSyncingFirebase}
                        className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 text-[11px] font-bold p-2 px-5 rounded-lg transition shrink-0 cursor-pointer w-full md:w-auto font-sans"
                      >
                        {isSyncingFirebase ? 'Synchronizing...' : 'Trigger Master Bulk Sync'}
                      </button>
                    </div>
                  </div>

                  {/* Admin Permissions Suite Section */}
                  <AdminPermissionsSettings />
                </>
              )}
            </div>
          )}

          {activeTab === 'propertymanager' && (
            <div className="animate-in fade-in duration-300">
              {getPermission('propertymanager') === 'No Access' ? (
                renderRestrictedMessage('Property Code Terminal')
              ) : (
                <>
                  {getPermission('propertymanager') === 'Viewer' && renderViewerBanner('Property Code Terminal')}
                  <PropertyManagerTab 
                    propertyClients={propertyClients}
                    onUpdatePropertyClients={(updated) => persist({ propertyClients: updated })}
                    syncLogs={syncLogs}
                    onClearSyncLogs={() => persist({ syncLogs: [] })}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'excel' && (
            <div className="animate-in fade-in duration-300 space-y-4">
              {getPermission('propertymanager') === 'No Access' ? (
                renderRestrictedMessage('Interactive Sheets')
              ) : (
                <>
                  {getPermission('propertymanager') === 'Viewer' && renderViewerBanner('Interactive Sheets')}
                  <ExcelSpreadsheetApp
                    propertyClients={propertyClients}
                    onUpdatePropertyClients={(updatedLeads) => {
                      persist({ propertyClients: updatedLeads });
                      
                      // Also push to Firestore if connected
                      if (db) {
                        updatedLeads.forEach(async (lead) => {
                          try {
                            await setDoc(doc(db, "property_clients", lead.id), {
                              ...lead,
                              updatedSchemaVersion: "3.0"
                            });
                          } catch (e) {
                            console.warn("Firebase sync failed for lead:", lead.id, e);
                          }
                        });
                      }
                    }}
                    syncLogs={syncLogs}
                  />
                </>
              )}
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
