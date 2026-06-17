/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChatThread, Message, Agent } from '../types';
import { Send, Smartphone, Check, CheckCheck, Bot, User, PhoneCall, Image, Paperclip, Zap, X, Plus, Trash2, Edit3, Save, Sparkles, Users, ShieldCheck } from 'lucide-react';

interface WhatsAppSimulatorProps {
  chats: ChatThread[];
  agents: Agent[];
  onSendMessage: (chatId: string, text: string, sender: Message['sender'], senderName: string) => void;
  onSelectChat?: (chat: ChatThread) => void;
}

export default function WhatsAppSimulator({ chats, agents, onSendMessage, onSelectChat }: WhatsAppSimulatorProps) {
  const [selectedChatId, setSelectedChatId] = useState<string>(chats[0]?.id || '');
  
  // --- SHADOW MODE & JUNIOR AGENT DRAFT POOL ---
  const [simulatorRole, setSimulatorRole] = useState<'junior' | 'manager'>(() => {
    const savedActive = localStorage.getItem('wasender_active_test_role') || 'role-super-admin';
    return savedActive.includes('agent') ? 'junior' : 'manager';
  });

  const [shadowDrafts, setShadowDrafts] = useState<{ id: string; chatId: string; draftText: string; draftedBy: string; timestamp: string }[]>(() => {
    const saved = localStorage.getItem('sierra_shadow_mode_drafts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fail-safe
      }
    }
    return [
      {
        id: 'draft-initial-1',
        chatId: chats[0]?.id || '1',
        draftText: "Hello there! Ahmed Fawzy advised me to share the pricing breakdowns and down payment plans for the Sierra Blu launch. Let me know if you would like me to draft a PDF schedule right now.",
        draftedBy: "Junior Agent (Draft)",
        timestamp: "10:12 AM"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('sierra_shadow_mode_drafts', JSON.stringify(shadowDrafts));
  }, [shadowDrafts]);

  const [messageText, setMessageText] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId) || chats[0];
  const assignedAgent = selectedChat ? agents.find(a => a.id === selectedChat.agentId) : null;

  // Drawer options
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState<boolean>(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState<boolean>(false);

  // Automated suggestion states when a customer sends a new message
  const [smartDraft, setSmartDraft] = useState<string>('');
  const [isSmartDraftLoading, setIsSmartDraftLoading] = useState<boolean>(false);
  const [draftChatId, setDraftChatId] = useState<string>('');

  useEffect(() => {
    if (!selectedChat) {
      setSmartDraft('');
      return;
    }

    const messages = selectedChat.messages || [];
    if (messages.length === 0) {
      setSmartDraft('');
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const isLastFromCustomer = lastMessage.sender === 'customer';

    if (isLastFromCustomer) {
      // Avoid duplicate draft generation for the same message state
      const uniqueMsgKey = selectedChat.id + '-' + messages.length;
      if (draftChatId === uniqueMsgKey) {
        return;
      }
      setDraftChatId(uniqueMsgKey);

      const fetchSmartDraft = async () => {
        setIsSmartDraftLoading(true);
        try {
          const lastMessages = messages.slice(-5).map(m => `${m.senderName}: ${m.text}`).join('\n');
          const response = await fetch('/api/gemini/generate-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatHistory: lastMessages,
              customerName: selectedChat.customerName
            })
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.text) {
              setSmartDraft(data.text);
            }
          } else {
            throw new Error('API failed');
          }
        } catch (e) {
          console.warn("Auto draft generating failed, using local matching fallback:", e);
          const fallbacks = [
            `Hello ${selectedChat.customerName}! Thank you for your message. Ahmed Fawzy from Sierra Estates is checking the availability of this specific property tier for you right now.`,
            `Salamat ${selectedChat.customerName}! I would be happy to share custom pricing, installment terms, and the brochure for our New Cairo compound options immediately.`,
            `Hi ${selectedChat.customerName}, thanks for reaching out. We can arrange a quick audio session tomorrow over WhatsApp or Zoom to walk through this!`
          ];
          const picked = fallbacks[Math.floor(Math.random() * fallbacks.length)];
          setSmartDraft(picked);
        } finally {
          setIsSmartDraftLoading(false);
        }
      };

      fetchSmartDraft();
    } else {
      setSmartDraft('');
    }
  }, [selectedChat?.id, selectedChat?.messages?.length]);

  const suggestAIReply = async () => {
    if (!selectedChat) return;
    setIsGeneratingReply(true);

    try {
      // Gather active message thread history
      const lastMessages = selectedChat.messages.slice(-5).map(m => `${m.senderName}: ${m.text}`).join('\n');
      
      const response = await fetch('/api/gemini/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: lastMessages || 'Client wants to learn about real estate developments.',
          customerName: selectedChat.customerName
        })
      });

      if (!response.ok) {
        throw new Error('API server reply status ' + response.status);
      }

      const data = await response.json();
      if (data && data.text) {
        setMessageText(data.text);
        setSmartDraft(data.text);
      } else {
        throw new Error('Empty response');
      }
    } catch (error) {
      console.warn("Real Gemini generated reply failed, using custom local preset:", error);
      const replies = [
        `Dear ${selectedChat.customerName}, yes absolutely. We have a selection of gorgeous premium properties on active payment plans. May I book you a priority view slot?`,
        `Salam ${selectedChat.customerName}! This is Ahmed Fawzy from Sierra Estates. I received your request and will send the detailed floor plans to you right now.`,
        `Hi ${selectedChat.customerName}, thank you for reaching out! Sierra Heights units are launching this weekend. I can share the exclusive unit list if you like.`
      ];
      const picked = replies[Math.floor(Math.random() * replies.length)];
      setMessageText(picked);
      setSmartDraft(picked);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  interface QuickReply {
    id: string;
    title: string;
    text: string;
  }

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(() => {
    const saved = localStorage.getItem('sierra_quick_replies');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fail-safe
      }
    }
    return [
      {
        id: '1',
        title: '✉️ Request Email',
        text: 'Sure, please let me know your email address to forward details and brochure sheets.'
      },
      {
        id: '2',
        title: '💳 Installment Options',
        text: 'Excellent! Installment options allow a downpayment starting from 10% with payment terms extended over 8 years. When can we arrange a quick phone call?'
      },
      {
        id: '3',
        title: '📞 Request Call',
        text: 'Awesome, let is arrange a brief audio session tomorrow to answer all your inquiries.'
      },
      {
        id: '4',
        title: '✨ Welcome Message',
        text: 'Hello! Welcome to Sierra Blu Realty. How can I help you find your dream property today?'
      },
      {
        id: '5',
        title: '📍 Mivida Location',
        text: 'The property lies in the prestigious Mivida Compound, New Cairo. Immediate delivery is available!'
      }
    ];
  });

  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  useEffect(() => {
    localStorage.setItem('sierra_quick_replies', JSON.stringify(quickReplies));
  }, [quickReplies]);

  const handleSaveQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    if (editingReply) {
      setQuickReplies(prev => prev.map(q => q.id === editingReply.id ? { ...q, title: newTitle.trim(), text: newText.trim() } : q));
      setEditingReply(null);
    } else {
      const newReply: QuickReply = {
        id: Date.now().toString(),
        title: newTitle.trim(),
        text: newText.trim()
      };
      setQuickReplies(prev => [...prev, newReply]);
    }
    setNewTitle('');
    setNewText('');
    setIsAddFormOpen(false);
  };

  const handleStartEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setNewTitle(reply.title);
    setNewText(reply.text);
  };

  const handleCancelEdit = () => {
    setEditingReply(null);
    setNewTitle('');
    setNewText('');
  };

  const handleDeleteQuickReply = (id: string) => {
    setQuickReplies(prev => prev.filter(q => q.id !== id));
    if (editingReply?.id === id) {
      handleCancelEdit();
    }
  };

  const insertSnippet = (text: string) => {
    setMessageText(prev => {
      if (prev.trim() === '') return text;
      return prev + '\n' + text;
    });
  };

  const sendSnippetDirectly = (text: string) => {
    if (!selectedChat) return;

    if (simulatorRole === 'junior') {
      const newDraft = {
        id: 'draft-' + Date.now(),
        chatId: selectedChat.id,
        draftText: text,
        draftedBy: assignedAgent ? assignedAgent.name : 'Junior Support Agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setShadowDrafts(prev => [...prev, newDraft]);
      alert('📝 Snippet saved as approval draft! Switch to Manager mode to review.');
      return;
    }

    const senderName = assignedAgent ? assignedAgent.name : 'System Hub';
    onSendMessage(selectedChat.id, text, 'agent', senderName);

    // Trigger simulated customer auto-reply after 2.5 seconds to close the feedback loop!
    setTimeout(() => {
      let reply = "Hello! Thanks for your response. Ahmed Fawzy told me to check this premium offer today. Can you send further brochures?";
      if (text.toLowerCase().includes('email')) {
        reply = "My email is contact.client@gmail.com. Please send me maps location pin as well.";
      } else if (text.toLowerCase().includes('price') || text.toLowerCase().includes('how much')) {
        reply = "That fits my budget pool! Are there custom installment installments over 8 years?";
      } else if (text.toLowerCase().includes('call') || text.toLowerCase().includes('zoom')) {
        reply = "Yes, please call me tomorrow at 3 PM Cairo local time. WhatsApp calls work best for me.";
      }

      onSendMessage(selectedChat.id, reply, 'customer', selectedChat.customerName);
    }, 2500);
  };

  // Auto scroll messages to bottom on new additions
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  // Handle manual agent replica transmission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat) return;

    if (simulatorRole === 'junior') {
      const newDraft = {
        id: 'draft-' + Date.now(),
        chatId: selectedChat.id,
        draftText: messageText.trim(),
        draftedBy: assignedAgent ? assignedAgent.name : 'Junior Support Agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setShadowDrafts(prev => [...prev, newDraft]);
      setMessageText('');
      alert('📝 Draft queued! Switch simulated persona to "Review as Manager" to inspect and approve.');
      return;
    }

    const senderName = assignedAgent ? assignedAgent.name : 'System Hub';
    onSendMessage(selectedChat.id, messageText, 'agent', senderName);
    
    const submittedText = messageText;
    setMessageText('');

    // Trigger simulated customer auto-reply after 2.5 seconds to close the feedback loop!
    setTimeout(() => {
      let reply = "Hello! Thanks for your response. Ahmed Fawzy told me to check this premium offer today. Can you send further brochures?";
      if (submittedText.toLowerCase().includes('email')) {
        reply = "My email is contact.client@gmail.com. Please send me maps location pin as well.";
      } else if (submittedText.toLowerCase().includes('price') || submittedText.toLowerCase().includes('how much')) {
        reply = "That fits my budget pool! Are there custom installment installments over 8 years?";
      } else if (submittedText.toLowerCase().includes('call') || submittedText.toLowerCase().includes('zoom')) {
        reply = "Yes, please call me tomorrow at 3 PM Cairo local time. WhatsApp calls work best for me.";
      }
      
      onSendMessage(selectedChat.id, reply, 'customer', selectedChat.customerName);
    }, 2500);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-850 shadow-sm overflow-hidden h-[600px] flex">
      
      {/* Threads list (left sidebar) */}
      <div className="w-80 border-r border-slate-850 flex flex-col bg-slate-950/40">
        <div className="p-4 border-b border-slate-850 bg-slate-900">
          <h4 className="font-bold text-slate-100 text-sm">WhatsApp Live Inbox</h4>
          <p className="text-[10px] text-slate-500">Manage real-time communication dispatched from WASender blast.</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
          {chats.map((chat) => {
            const isSelected = chat.id === selectedChatId;
            const chatAgent = agents.find(a => a.id === chat.agentId);
            return (
              <button
                key={chat.id}
                onClick={() => {
                  setSelectedChatId(chat.id);
                  chat.unreadCount = 0; // mark read on select
                  if (onSelectChat) onSelectChat(chat);
                }}
                className={`w-full text-left p-4 flex gap-3 transition-colors ${
                  isSelected ? 'bg-indigo-950/30 border-l-4 border-indigo-505' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-indigo-950/40 border border-slate-855 flex items-center justify-center text-lg font-bold">
                    💬
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 block bg-rose-500 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate block">{chat.customerName}</span>
                    <span className="text-[9px] font-mono text-slate-505">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate leading-relaxed">{chat.lastMessageText}</p>
                  
                  {chatAgent && (
                    <div className="flex items-center gap-1">
                      <img referrerPolicy="no-referrer" src={chatAgent.avatar} className="w-3.5 h-3.5 rounded-full border border-slate-800" alt="avatar" />
                      <span className="text-[9px] text-indigo-400 font-semibold">{chatAgent.name}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chat window container */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-slate-950/60 relative">
          
          {/* Subtle WhatsApp style pattern decoration */}
          <div className="absolute inset-0 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e0e12b94530da357bb335d050.png')] opacity-[0.02] pointer-events-none"></div>

          {/* Subheader */}
          <div className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-650 text-white flex items-center justify-center font-bold">
                📱
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-200">{selectedChat.customerName}</h5>
                <span className="text-[10px] text-emerald-400 font-bold block">{selectedChat.customerPhone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickRepliesOpen(prev => !prev)}
                className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border ${
                  isQuickRepliesOpen 
                    ? 'bg-amber-600 text-slate-950 hover:bg-amber-500 border-amber-500/30 font-black' 
                    : 'bg-slate-800 text-slate-350 hover:bg-slate-700 border-slate-700 font-bold'
                }`}
              >
                <Zap size={12} className={isQuickRepliesOpen ? 'text-slate-950 fill-slate-950/20' : 'text-amber-400 fill-amber-400/20'} />
                <span>Quick Replies</span>
              </button>

              {assignedAgent && (
                <div className="bg-indigo-950/40 border border-indigo-900/30 rounded-lg p-1.5 px-3 flex items-center gap-2">
                  <img referrerPolicy="no-referrer" src={assignedAgent.avatar} className="w-5 h-5 rounded-full border border-slate-800" alt="agent" />
                  <div className="text-left">
                    <span className="text-[8px] text-slate-550 uppercase tracking-widest block font-bold leading-none">ASSIGNED AGENT</span>
                    <span className="text-[10px] font-bold text-indigo-400 leading-none block mt-0.5">{assignedAgent.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Persona role toggle bar */}
          <div className="bg-slate-900 border-b border-slate-850 px-4 py-2.5 flex items-center justify-between text-xs z-10 shrink-0">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${simulatorRole === 'junior' ? 'bg-[#C8961A]/10 text-[#C8961A]' : 'bg-indigo-950/40 text-indigo-405'}`}>
                <Users size={11} className="shrink-0" />
              </div>
              <span className="text-slate-450 text-[10px] font-medium font-sans">Simulated Persona:</span>
              <strong className={`uppercase tracking-wider font-mono text-[10px] flex items-center gap-1.5 ${simulatorRole === 'junior' ? 'text-[#E9C176]' : 'text-indigo-400'}`}>
                {simulatorRole === 'junior' ? (
                  <>Junior Agent • Shadow Mode (Drafting) 👤</>
                ) : (
                  <>Manager • Live Oversight (Approvals) 👑</>
                )}
              </strong>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-850">
              <button
                type="button"
                onClick={() => setSimulatorRole('junior')}
                className={`p-1 px-2.5 rounded text-[9px] uppercase font-bold transition-all cursor-pointer select-none leading-none ${
                  simulatorRole === 'junior'
                    ? 'bg-[#C8961A] text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Junior Active
              </button>
              <button
                type="button"
                onClick={() => setSimulatorRole('manager')}
                className={`p-1 px-2.5 rounded text-[9px] uppercase font-bold transition-all cursor-pointer select-none leading-none ${
                  simulatorRole === 'manager'
                    ? 'bg-indigo-650 text-white font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Manager Active
              </button>
            </div>
          </div>

          {/* Message bubble stream scroll content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3 z-10">
            {selectedChat.messages.map((m) => {
              const fromCustomer = m.sender === 'customer';
              const fromSystem = m.sender === 'system';

              if (fromSystem) {
                return (
                  <div key={m.id} className="mx-auto text-center w-full max-w-lg p-2.5 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] rounded-lg font-mono leading-relaxed space-y-1">
                    <div className="flex items-center justify-center gap-1 text-slate-400 uppercase font-bold text-[8px] tracking-widest">
                      <Bot size={11} className="text-emerald-500" /> SYSTEM TRANSMITTAL LOG
                    </div>
                    <p>{m.text}</p>
                    <span className="block text-[8px] text-slate-500">{m.timestamp}</span>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex w-full ${fromCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`p-3 rounded-lg max-w-md shadow-sm relative text-xs leading-relaxed border ${
                    fromCustomer 
                      ? 'bg-slate-900 text-slate-200 rounded-tl-none border-slate-800' 
                      : 'bg-emerald-950/40 text-emerald-100 rounded-tr-none border-emerald-900/30'
                  }`}>
                    
                    {/* Header handler name tag */}
                    <span className={`block font-bold text-[9px] mb-1 uppercase ${fromCustomer ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {m.senderName}
                    </span>

                    <p className="whitespace-pre-line text-slate-200">{m.text}</p>
                    
                    <div className="text-right text-[8px] text-slate-500 font-mono mt-1 flex justify-end items-center gap-0.5">
                      <span>{m.timestamp}</span>
                      {!fromCustomer && <CheckCheck size={11} className="text-[#34B7F1]" />}
                    </div>

                  </div>
                </div>
              );
            })}

            {/* NEW: Shadow Mode Drafts Panel rendered directly in the message flow */}
            {shadowDrafts
              .filter(d => d.chatId === selectedChat.id)
              .map((draft) => (
                <div key={draft.id} className="w-full flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-3.5 bg-yellow-950/15 text-yellow-100 border border-dashed border-amber-550/40 rounded-lg max-w-sm rounded-tr-none shadow-md flex flex-col space-y-2.5">
                    <div className="flex items-center justify-between border-b border-amber-900/25 pb-1.5 text-[9px] font-bold text-[#E9C176] uppercase tracking-wider gap-3">
                      <span className="flex items-center gap-1">
                        <Users size={11} className="text-[#E9C176]" />
                        Draft by: {draft.draftedBy}
                      </span>
                      <span className="bg-[#1e1b18] text-[#C8961A] p-0.5 px-1.5 rounded text-[8px] font-bold font-mono border border-amber-900/35">
                        Approval Queue
                      </span>
                    </div>

                    <p className="whitespace-pre-line text-xs font-semibold text-slate-100 italic leading-relaxed">
                      "{draft.draftText}"
                    </p>

                    <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-amber-900/10">
                      <span>Submitted today {draft.timestamp}</span>
                      
                      {simulatorRole === 'manager' ? (
                        <div className="flex gap-1 text-[9px] font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              // Reject & Discard
                              setShadowDrafts(prev => prev.filter(d => d.id !== draft.id));
                            }}
                            className="px-2 py-0.5 bg-rose-950/30 hover:bg-rose-955/65 border border-rose-900/35 text-rose-400 rounded transition cursor-pointer font-bold uppercase tracking-wider text-[8px]"
                          >
                            Reject ❌
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Load back & Edit
                              setMessageText(draft.draftText);
                              setShadowDrafts(prev => prev.filter(d => d.id !== draft.id));
                            }}
                            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-350 hover:text-slate-100 rounded transition cursor-pointer font-bold uppercase tracking-wider text-[8px]"
                          >
                            Edit Draft 📝
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const bName = assignedAgent ? assignedAgent.name : 'System Hub';
                              onSendMessage(selectedChat.id, draft.draftText, 'agent', bName);
                              setShadowDrafts(prev => prev.filter(d => d.id !== draft.id));

                              // Simulated customer response to approved draft replies
                              setTimeout(() => {
                                onSendMessage(
                                  selectedChat.id,
                                  "Sounds fully compliant, thanks! Please set up a slot with Ahmed Fawzy to call.",
                                  'customer',
                                  selectedChat.customerName
                                );
                              }, 2500);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700/40 rounded shadow transition cursor-pointer flex items-center gap-0.5 font-bold uppercase tracking-wider text-[8px]"
                          >
                            Approve & Send ⚡
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] text-amber-550 font-bold animate-pulse flex items-center gap-1 font-sans">
                          ⏳ Awaiting Manager Approval
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            <div ref={chatEndRef} />
          </div>

          {/* Smart Co-Pilot Draft Suggestion */}
          {(isSmartDraftLoading || smartDraft) && (
            <div className="bg-[#0f172a] border-t border-b border-indigo-950 p-3.5 z-10 text-xs flex flex-col gap-2.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-blue-400 tracking-wider uppercase">
                  <Sparkles size={13} className="text-blue-400 animate-pulse" />
                  Gemini Co-Pilot Smart Draft
                </span>
                {isSmartDraftLoading ? (
                  <span className="text-[10px] text-slate-400 font-mono italic animate-pulse">Formulating reply...</span>
                ) : (
                  <span className="text-[8px] text-blue-300 font-bold bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/60 uppercase">Context-Aware</span>
                )}
              </div>
              
              {isSmartDraftLoading ? (
                <div className="space-y-1.5 py-1">
                  <div className="h-3 bg-slate-800 rounded animate-pulse w-11/12" />
                  <div className="h-3 bg-slate-800 rounded animate-pulse w-3/4" />
                </div>
              ) : (
                <p className="text-slate-100 italic font-medium leading-relaxed bg-[#1e293b]/30 p-2.5 rounded-lg border border-slate-800/40">"{smartDraft}"</p>
              )}

              {!isSmartDraftLoading && smartDraft && (
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageText(smartDraft);
                    }}
                    className="flex-1 py-1 px-3 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-900/50 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    Insert to Chat Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sendSnippetDirectly(smartDraft);
                      setSmartDraft('');
                    }}
                    className="flex-1 py-1 px-3 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md hover:shadow-cyan-950"
                  >
                    Send Instantly ⚡
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick variables helper selection panel */}
          <div className="bg-slate-100 p-2 z-10 border-t border-slate-200 flex gap-2 items-center overflow-x-auto">
            <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Quick Snippets:</span>
            {quickReplies.slice(0, 4).map((reply) => (
              <button 
                key={reply.id}
                type="button"
                onClick={() => insertSnippet(reply.text)} 
                className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold text-slate-700 rounded-full shrink-0 transition-all shadow-sm cursor-pointer"
                title={reply.text}
              >
                {reply.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsQuickRepliesOpen(prev => !prev)}
              className="p-1 px-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-[10px] font-bold text-amber-700 rounded-full shrink-0 transition-all shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
            >
              <Zap size={10} />
              {isQuickRepliesOpen ? 'Hide Drawer' : 'Manage Snippets'}
            </button>
          </div>

          {/* Bottom Typing Bar */}
          <form 
            onSubmit={handleSendMessage} 
            className={`p-3.5 border-t flex gap-2 items-center z-10 shadow-lg transition-colors duration-300 ${
              simulatorRole === 'junior' 
                ? 'bg-amber-50/40 border-amber-200' 
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex gap-2 text-slate-400 mr-1 shrink-0">
              <button type="button" onClick={() => alert('Feature simulated: Upload document attachments.')} className="hover:text-slate-600"><Paperclip size={18} /></button>
              <button type="button" onClick={() => alert('Feature simulated: Attach images from brochure gallery.')} className="hover:text-slate-600"><Image size={18} /></button>
            </div>
            
            <input
              type="text"
              required
              placeholder={simulatorRole === 'junior' ? "Draft a junior reply for manager review..." : "Type your WhatsApp message..."}
              className={`flex-1 p-2 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 transition-all ${
                simulatorRole === 'junior'
                  ? 'border-amber-300 focus:ring-amber-500 bg-amber-50/10 placeholder-amber-700/40'
                  : 'border-slate-200 focus:ring-emerald-500'
              }`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />

            {/* AI Suggest Reply Button */}
            <button
              type="button"
              onClick={suggestAIReply}
              disabled={isGeneratingReply}
              title={simulatorRole === 'junior' ? "Generate Draft with AI" : "AI Smart Reply Suggestion"}
              className={`p-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center shrink-0 cursor-pointer ${
                isGeneratingReply
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : simulatorRole === 'junior'
                    ? 'bg-amber-100/70 hover:bg-amber-100 text-amber-850 border-amber-200'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
            >
              <Sparkles size={14} className={isGeneratingReply ? 'animate-spin text-amber-500' : simulatorRole === 'junior' ? 'text-amber-605' : 'text-indigo-600'} />
            </button>

            <button
              type="submit"
              className={`p-2 px-4 rounded-lg text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer text-white ${
                simulatorRole === 'junior'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/10 border border-amber-700'
                  : 'bg-[#128C7E] hover:bg-[#075E54] hover:shadow-emerald-950/20'
              }`}
            >
              {simulatorRole === 'junior' ? (
                <>
                  <Users size={12} className="text-white" />
                  Queue Draft 👥
                </>
              ) : (
                <>
                  <Send size={12} />
                  Send Message
                </>
              )}
            </button>
          </form>

        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-500">
          <User size={48} className="stroke-1 text-slate-700" />
          <p className="mt-2 text-xs font-semibold">Select a chat conversation on the left list to begin replying.</p>
        </div>
      )}

      {/* Quick Replies Drawer Sidebar (right side) */}
      {selectedChat && isQuickRepliesOpen && (
        <div className="w-80 border-l border-slate-850 flex flex-col bg-slate-900 text-slate-100 z-10 h-full">
          <div className="p-4 border-b border-slate-850 bg-slate-950/20 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400 fill-amber-400/20" />
                Quick Replies
              </h4>
              <p className="text-[9px] text-slate-400">Templates for rapid response</p>
            </div>
            <button 
              onClick={() => setIsQuickRepliesOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* New snippet button / Form */}
          <div className="p-4 border-b border-slate-850 bg-slate-950/40">
            {isAddFormOpen || editingReply ? (
              <form onSubmit={handleSaveQuickReply} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    {editingReply ? '✏️ Edit Template' : '➕ New Snippet'}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddFormOpen(false);
                      handleCancelEdit();
                    }}
                    className="text-[9px] font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase block">Snippet Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. ✉️ Ask for Location"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-semibold text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase block">Response Template Text</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Type the message template here..."
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-all uppercase tracking-wider cursor-pointer font-black"
                >
                  <Save size={11} />
                  {editingReply ? 'Update Template' : 'Add Snippet'}
                </button>
              </form>
            ) : (
              <button 
                onClick={() => {
                  setIsAddFormOpen(true);
                  setNewTitle('');
                  setNewText('');
                }}
                className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-amber-400 border border-amber-900/40 text-[10px] font-semibold rounded flex items-center justify-center gap-1 transition-all uppercase tracking-wider cursor-pointer font-bold"
              >
                <Plus size={12} />
                Create New Template
              </button>
            )}
          </div>

          {/* List scroll view */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {quickReplies.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-8">No custom templates. Create one above!</p>
            ) : (
              quickReplies.map((reply) => (
                <div key={reply.id} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-850/60 transition-all hover:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-[#E9C176]">{reply.title}</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleStartEdit(reply)}
                          className="p-1 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
                          title="Edit snippet"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button 
                          onClick={() => handleDeleteQuickReply(reply.id)}
                          className="p-1 text-slate-550 hover:text-rose-405 rounded cursor-pointer"
                          title="Delete snippet"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1 block leading-relaxed">{reply.text}</p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-850/40">
                    <button 
                      type="button"
                      onClick={() => insertSnippet(reply.text)}
                      className="flex-1 py-1 bg-slate-955 hover:bg-slate-850 text-slate-300 border border-slate-800 text-[9px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer"
                      title="Insert to message text input"
                    >
                      Use template
                    </button>
                    <button 
                      type="button"
                      onClick={() => sendSnippetDirectly(reply.text)}
                      className={`flex-1 py-1 text-[9px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                        simulatorRole === 'junior'
                          ? 'bg-amber-950/20 hover:bg-amber-950/45 text-amber-400 border-amber-900/40'
                          : 'bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                      }`}
                      title={simulatorRole === 'junior' ? "Draft this template" : "Send immediately to client"}
                    >
                      {simulatorRole === 'junior' ? 'Draft 👥' : 'Send 💬'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
