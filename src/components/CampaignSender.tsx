/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Campaign, Recipient } from '../types';
import { 
  Send, Upload, Play, Pause, RefreshCw, Smartphone, 
  Trash2, Plus, Sparkles, Check, CheckCheck, Loader2, AlertCircle, FileSpreadsheet,
  Calendar, Clock, Download
} from 'lucide-react';

interface CampaignSenderProps {
  campaigns: Campaign[];
  onAddCampaign: (campaign: Campaign) => void;
  onUpdateCampaignStatus: (id: string, status: Campaign['status'], sentCount: number, failedCount: number, recipients: Recipient[]) => void;
}

export default function CampaignSender({ campaigns, onAddCampaign, onUpdateCampaignStatus }: CampaignSenderProps) {
  // Creator view vs Log history view
  const [composerView, setComposerView] = useState<boolean>(true);
  
  // Compose form values
  const [campaignName, setCampaignName] = useState<string>('');
  const [messageText, setMessageText] = useState<string>(
    'Hi {{Name}}! This is Ahmed Fawzy from Sierra Estates. I noticed you were interested in {{Property}}. We have an exclusive private viewing launch this week starting at {{Price}}. Would you like to schedule a slot?'
  );
  const [delayMin, setDelayMin] = useState<number>(2);
  const [delayMax, setDelayMax] = useState<number>(5);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaName, setMediaName] = useState<string>('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState<boolean>(false);

  // Recipients State
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', name: 'Karim Abdelaziz', phone: '+20101112223', property: 'Sierra Heights Villa #12', price: '$490,000', status: 'pending' },
    { id: '2', name: 'Hend Sabry', phone: '+20111222333', property: 'Easylisting Cairo Apartment B', price: '$180,000', status: 'pending' },
    { id: '3', name: 'Mona Zaki', phone: '+20121333444', property: 'Westown Executive Townhouse', price: '$310,000', status: 'pending' },
    { id: '4', name: 'Ahmed Helmy', phone: 'invalid-whatsapp-format', property: 'Mountain View Penthouse', price: '$270,000', status: 'pending' }
  ]);

  // Inline recipient add inputs
  const [newRecipName, setNewRecipName] = useState<string>('');
  const [newRecipPhone, setNewRecipPhone] = useState<string>('');
  const [newRecipProb, setNewRecipProb] = useState<string>('');
  const [newRecipPrice, setNewRecipPrice] = useState<string>('');

  // CSV importer and Drag & Drop states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [csvFeedback, setCsvFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear feedback message automatically
  useEffect(() => {
    if (csvFeedback) {
      const timer = setTimeout(() => {
        setCsvFeedback(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [csvFeedback]);

  // active executing campaign
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentSendingIndex, setCurrentSendingIndex] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Confirmation Modal to prevent accidental bulk triggers
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Scheduling states
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [currentTimeState, setCurrentTimeState] = useState<number>(Date.now());

  // Synchronize current time for countdown tickers
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTimeState(Date.now());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Automatic Scheduled Campaign Checker
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const nextScheduledCampaign = campaigns.find(
        c => c.status === 'scheduled' && c.scheduledAt && new Date(c.scheduledAt).getTime() <= now
      );

      if (nextScheduledCampaign) {
        // Automatically start the campaign!
        onUpdateCampaignStatus(
          nextScheduledCampaign.id,
          'sending',
          0,
          0,
          nextScheduledCampaign.recipients.map(r => ({ ...r, status: 'pending' }))
        );
        setActiveCampaignId(nextScheduledCampaign.id);
        setCurrentSendingIndex(0);
        setIsRunning(true);
        setComposerView(false); // Switch to logs view to see the active campaign!
        
        // Trigger browser audio indicator
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
          console.log('Audio notification failed: ', e);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [campaigns, onUpdateCampaignStatus]);

  // A helper function to get the remaining time in a readable format
  const getCountdownString = (scheduledAtIso?: string) => {
    if (!scheduledAtIso) return '';
    const diff = new Date(scheduledAtIso).getTime() - currentTimeState;
    if (diff <= 0) return 'Initiating...';
    
    const totalSecs = Math.floor(diff / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  // Template placeholders
  const insertTemplateTag = (tag: string) => {
    setMessageText(prev => prev + ` {{${tag}}}`);
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipPhone || !newRecipName) return;
    const newRecip: Recipient = {
      id: Date.now().toString(),
      name: newRecipName,
      phone: newRecipPhone,
      property: newRecipProb || 'General Inquiry',
      price: newRecipPrice || 'On Request',
      status: 'pending'
    };
    setRecipients(prev => [...prev, newRecip]);
    setNewRecipName('');
    setNewRecipPhone('');
    setNewRecipProb('');
    setNewRecipPrice('');
  };

  const handleDeleteRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const parseCSVText = (text: string): Recipient[] => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    // Detect delimiter
    const delimiter = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';

    // Parse CSV rows considering potential quotes
    const parseCSVRow = (rowText: string, delim: string): string[] => {
      const result: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      for (let i = 0; i < rowText.length; i++) {
        const char = rowText[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          result.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      result.push(currentVal.trim());
      // Strip outer quotes if any
      return result.map(v => v.replace(/^"|"$/g, '').trim());
    };

    const parsedRows = lines.map(line => parseCSVRow(line, delimiter));
    const firstRow = parsedRows[0];
    const headers = firstRow.map(h => h.toLowerCase());

    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nome') || h.includes('client') || h.includes('customer') || h.includes('contact'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('whatsapp') || h.includes('number') || h.includes('telefone') || h.includes('celular'));
    const propIdx = headers.findIndex(h => h.includes('prop') || h.includes('segment') || h.includes('interest') || h.includes('chalet') || h.includes('villa') || h.includes('apartment'));
    const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('tag') || h.includes('budget') || h.includes('val'));

    const mappedRecipients: Recipient[] = [];
    const hasHeaders = nameIdx !== -1 || phoneIdx !== -1;
    const startIndex = hasHeaders ? 1 : 0;

    for (let i = startIndex; i < parsedRows.length; i++) {
      const columns = parsedRows[i];
      if (columns.length === 0 || (columns.length === 1 && !columns[0])) continue;

      let name = '';
      let phone = '';
      let property = 'General Inquiry';
      let price = 'On Request';

      if (hasHeaders) {
        if (nameIdx !== -1 && nameIdx < columns.length) name = columns[nameIdx];
        if (phoneIdx !== -1 && phoneIdx < columns.length) phone = columns[phoneIdx];
        if (propIdx !== -1 && propIdx < columns.length) property = columns[propIdx];
        if (priceIdx !== -1 && priceIdx < columns.length) price = columns[priceIdx];
      } else {
        if (columns.length > 0) name = columns[0];
        if (columns.length > 1) phone = columns[1];
        if (columns.length > 2) property = columns[2];
        if (columns.length > 3) price = columns[3];
      }

      // Default name if blank
      if (!name) name = `Imported Contact #${i + 1}`;
      
      // Clean phone number (removing random spaces, hyphens, brackets but keeping +)
      const cleanPhone = phone ? phone.replace(/[\s\-\(\)]/g, '') : '';
      if (!cleanPhone) continue; // skip entries without mobile/phone

      mappedRecipients.push({
        id: 'ul-' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 1000),
        name,
        phone: cleanPhone,
        property: property || 'General Inquiry',
        price: price || 'On Request',
        status: 'pending'
      });
    }

    return mappedRecipients;
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.name.endsWith('.txt')) {
      setCsvFeedback({
        type: 'error',
        text: 'Unsupported file format. Please upload a standard CSV (.csv) file.'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setCsvFeedback({
          type: 'error',
          text: 'The file appears to be empty.'
        });
        return;
      }
      try {
        const parsed = parseCSVText(text);
        if (parsed.length === 0) {
          setCsvFeedback({
            type: 'error',
            text: 'Could not parse any valid contacts with phone numbers. Make sure your CSV contains Name and Phone columns.'
          });
          return;
        }
        setRecipients(prev => [...prev, ...parsed]);
        setCsvFeedback({
          type: 'success',
          text: `Success! Imported and matched ${parsed.length} recipients. Name & phone mappings verified.`
        });
      } catch (err: any) {
        setCsvFeedback({
          type: 'error',
          text: 'Error parsing CSV file: ' + (err.message || err)
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const downloadTemplateCSV = () => {
    const csvContent = "Name,Phone,Property,Price\nKamal Chahine,+20101112223,Sierra Heights Penthouse,$420,000\nMariam Kourani,+20111222333,Zamalek Garden Duplex,$180,000\nJohn Watson,+447700900077,London Executive Suite,On Request\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "whatsapp_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearRecipients = () => {
    setRecipients([]);
    setCsvFeedback({
      type: 'info',
      text: 'Recipient list cleared successfully.'
    });
  };

  const handleCSVUploadSimulation = () => {
    // Generate some mock csv loaded leads
    const uploadedLeads: Recipient[] = [
      { id: 'ul-1', name: 'Amr Diab', phone: '+20100444333', property: 'Marina Coastal Chalet', price: '$650,000', status: 'pending' },
      { id: 'ul-2', name: 'Yasmine Sabri', phone: '+20101999888', property: 'Zamalek Duplex Penthouse', price: '$720,000', status: 'pending' },
      { id: 'ul-3', name: 'Mohamed Salah', phone: '+20111000999', property: 'Sierra Estates Premium Villa #1', price: '$1,200,000', status: 'pending' }
    ];
    setRecipients(uploadedLeads);
    setCsvFeedback({
      type: 'success',
      text: 'Simulated 3 premium property leads parsed successfully!'
    });
  };

  const handleExportDeliveryReport = () => {
    if (!activeCampaign) {
      alert('No campaign selected or active for report export.');
      return;
    }

    const headers = ['Recipient Name', 'WhatsApp Number', 'Property Segment', 'Price Reference', 'Delivery Status', 'Dispatch Time', 'Error / Log'];
    const rows = activeCampaign.recipients.map(r => [
      r.name,
      r.phone,
      r.property,
      r.price || 'Market Rate',
      r.status.toUpperCase(),
      r.sentAt || '--:--',
      r.errorMessage || 'No Error'
    ]);

    // Construct CSV file input, escaping quotes/commas appropriately
    const escapeCsvCell = (cell: any) => {
      const stringified = String(cell ?? '');
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replaceAll('"', '""')}"`;
      }
      return stringified;
    };

    const csvContent = [
      ['Campaign Performance Delivery Report'],
      ['Campaign Name', activeCampaign.name],
      ['Total Contacts Targeted', activeCampaign.totalRecipients],
      ['Successfully Sent', activeCampaign.sentCount],
      ['Failed / Blocked Fails', activeCampaign.failedCount],
      ['Delivery Progress Rate', `${Math.round(((activeCampaign.sentCount + activeCampaign.failedCount) / activeCampaign.totalRecipients) * 100)}%`],
      ['Campaign Status', activeCampaign.status.toUpperCase()],
      [],
      headers,
      ...rows
    ].map(row => row.map(escapeCsvCell).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedCampaignName = activeCampaign.name.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
    link.setAttribute("href", url);
    link.setAttribute("download", `delivery_report_${sanitizedCampaignName || 'campaign'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setCsvFeedback({
      type: 'info',
      text: `Performance delivery report exported successfully to delivery_report_${sanitizedCampaignName || 'campaign'}.csv!`
    });
  };

  // Replace tags with specific recipient property values
  const getRenderedMessage = (template: string, person: Recipient) => {
    let msg = template;
    msg = msg.replaceAll('{{Name}}', person.name);
    msg = msg.replaceAll('{{Property}}', person.property);
    msg = msg.replaceAll('{{Price}}', person.price || 'Market Rate');
    return msg;
  };

  // Campaign executor loop
  useEffect(() => {
    if (!isRunning || activeCampaignId === null) return;

    const campaign = campaigns.find(c => c.id === activeCampaignId);
    if (!campaign) return;

    const pendingRecipients = campaign.recipients;
    if (currentSendingIndex >= pendingRecipients.length) {
      // Completed Campaign!
      setIsRunning(false);
      onUpdateCampaignStatus(
        activeCampaignId, 
        'completed', 
        campaign.recipients.filter(r => r.status === 'sent').length,
        campaign.recipients.filter(r => r.status === 'failed').length,
        campaign.recipients
      );
      setActiveCampaignId(null);
      alert('Campaign completed successfully! Bulk WhatsApp blast transmittals fully recorded.');
      return;
    }

    const currentRecipient = pendingRecipients[currentSendingIndex];
    
    // Simulate delay
    const delay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;

    timerRef.current = setTimeout(() => {
      // Execute "sending"
      const updatedRecipients = [...campaign.recipients];
      const recip = { ...updatedRecipients[currentSendingIndex] };
      
      // Validation to simulate delivery failure
      if (recip.phone.includes('invalid') || recip.phone.length < 8) {
        recip.status = 'failed';
        recip.errorMessage = 'WhatsApp system node unregistered number';
      } else {
        recip.status = 'sent';
        recip.sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      updatedRecipients[currentSendingIndex] = recip;

      const sCount = updatedRecipients.filter(r => r.status === 'sent').length;
      const fCount = updatedRecipients.filter(r => r.status === 'failed').length;

      onUpdateCampaignStatus(activeCampaignId, 'sending', sCount, fCount, updatedRecipients);
      
      // Advance to next recipient
      setCurrentSendingIndex(prev => prev + 1);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, activeCampaignId, currentSendingIndex, campaigns, delayMin, delayMax, onUpdateCampaignStatus]);

  // Actual launch implementation after user confirms in the modal
  const executeCampaignLaunch = () => {
    setShowConfirmModal(false);

    // Reset all recipient status to pending for clean run
    const preppedRecipients = recipients.map(r => ({ ...r, status: 'pending' as const }));

    if (scheduleEnabled) {
      const parsedTime = new Date(scheduledAt);
      const newCampaign: Campaign = {
        id: 'camp-' + Date.now(),
        name: campaignName,
        status: 'scheduled',
        templateId: 'custom',
        messageText: messageText,
        mediaUrl: mediaUrl || undefined,
        mediaName: mediaName || undefined,
        createdAt: new Date().toISOString(),
        delayMin,
        delayMax,
        totalRecipients: preppedRecipients.length,
        sentCount: 0,
        failedCount: 0,
        recipients: preppedRecipients,
        scheduledAt: parsedTime.toISOString()
      };

      onAddCampaign(newCampaign);
      alert(`Campaign "${campaignName}" has been successfully scheduled to initiate on ${new Date(scheduledAt).toLocaleString()}!`);
      
      // Select the scheduled campaign to preview it
      setActiveCampaignId(newCampaign.id);
      
      // Re-initialize composer form
      setCampaignName('');
      setScheduleEnabled(false);
      setScheduledAt('');
      
      // Switch view to logs view so they can see the scheduled campaign countdown
      setComposerView(false);
      return;
    }

    const newCampaign: Campaign = {
      id: 'camp-' + Date.now(),
      name: campaignName,
      status: 'sending',
      templateId: 'custom',
      messageText: messageText,
      mediaUrl: mediaUrl || undefined,
      mediaName: mediaName || undefined,
      createdAt: new Date().toISOString(),
      delayMin,
      delayMax,
      totalRecipients: preppedRecipients.length,
      sentCount: 0,
      failedCount: 0,
      recipients: preppedRecipients
    };

    onAddCampaign(newCampaign);
    setActiveCampaignId(newCampaign.id);
    setCurrentSendingIndex(0);
    setIsRunning(true);
    setComposerView(false); // Switch to logs view to see the live updates
  };

  // Launch campaign - check validations first, then open confirmation modal
  const handleLaunchCampaign = () => {
    if (!campaignName) {
      alert('Please specify a Campaign Name first.');
      return;
    }
    if (recipients.length === 0) {
      alert('Please add at least one WhatsApp recipient.');
      return;
    }

    if (scheduleEnabled) {
      if (!scheduledAt) {
        alert('Please specify a Date and Time for the campaign schedule.');
        return;
      }
      const parsedTime = new Date(scheduledAt);
      if (isNaN(parsedTime.getTime())) {
        alert('Please select a valid scheduled Date and Time.');
        return;
      }
      if (parsedTime.getTime() <= Date.now()) {
        alert('The schedule date and time must be set in the future.');
        return;
      }
    }

    // Validation passed, show confirmation popup instead of immediate launch
    setShowConfirmModal(true);
  };

  const handlePauseResume = () => {
    setIsRunning(prev => {
      if (activeCampaignId) {
        onUpdateCampaignStatus(
          activeCampaignId,
          prev ? 'paused' : 'sending',
          campaigns.find(c => c.id === activeCampaignId)?.sentCount || 0,
          campaigns.find(c => c.id === activeCampaignId)?.failedCount || 0,
          campaigns.find(c => c.id === activeCampaignId)?.recipients || []
        );
      }
      return !prev;
    });
  };

  // Quick template trigger using server-side Gemini API with fallback
  const applyAIExtension = async () => {
    setIsGeneratingCopy(true);
    try {
      // Pick first recipient details to make the optimized template realistic
      const sample = recipients[0] || { property: 'Sierra Heights Villa #12', price: '$490,000', name: 'Karim Abdelaziz' };
      
      const response = await fetch('/api/gemini/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: sample.property,
          price: sample.price,
          clientName: sample.name
        })
      });

      if (!response.ok) {
        throw new Error('API server reply status ' + response.status);
      }

      const data = await response.json();
      if (data && data.text) {
        // Replace real name/property/price in generated copy with template tags for broad broadcast use
        let templateText = data.text;
        // Escape special regex chars
        const escapeRegExp = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        
        templateText = templateText
          .replace(new RegExp(escapeRegExp(sample.name), 'gi'), '{{Name}}')
          .replace(new RegExp(escapeRegExp(sample.property), 'gi'), '{{Property}}')
          .replace(new RegExp(escapeRegExp(sample.price), 'gi'), '{{Price}}');
        
        setMessageText(templateText);
      } else {
        throw new Error('Empty response');
      }
    } catch (error) {
      console.warn("Real Gemini generation failed, falling back to local template:", error);
      const responses = [
        "🔥 AMAZING DEAL! {{Name}}, check out our premier launch at {{Property}}! Limited premium units starting at {{Price}} with special payment plans. Speak to Ahmed Fawzy now on WhatsApp!",
        "Salam {{Name}}! Hope you are well. Ahmed from Sierra Estates here. Exclusive availability alert for {{Property}} (launching today at {{Price}}). Let me know if you would like me to share brochures or book a priority slot immediately.",
        "Hello {{Name}}, Ahmed Fawzy here. We have cataloged prime options at {{Property}} for {{Price}}. Would you prefer receiving the 3D VR Tour and layout floor plan on WhatsApp?"
      ];
      const picked = responses[Math.floor(Math.random() * responses.length)];
      setMessageText(picked);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* Left panel: Mode chooser + Composer or History logs */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Navigation selection / Tab Bar inside Module */}
        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setComposerView(true)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                composerView 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Compose WA Campaign
            </button>
            <button
              onClick={() => setComposerView(false)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                !composerView 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Campaign Transmission Log ({campaigns.length})
            </button>

            {!composerView && campaigns.length > 0 && (
              <div className="flex items-center gap-2 ml-1 md:ml-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Select:</span>
                <select
                  className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-505"
                  value={activeCampaignId || (campaigns[0] ? campaigns[0].id : '')}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    setActiveCampaignId(targetId);
                    const targetCampaign = campaigns.find(c => c.id === targetId);
                    if (targetCampaign) {
                      setIsRunning(targetCampaign.status === 'sending');
                      const finishedCount = targetCampaign.recipients.filter(r => r.status !== 'pending').length;
                      setCurrentSendingIndex(finishedCount);
                    }
                  }}
                >
                  {campaigns.map(c => {
                    let statusEmoji = '📝';
                    if (c.status === 'sending') statusEmoji = '📡';
                    if (c.status === 'scheduled') statusEmoji = '⏳';
                    if (c.status === 'paused') statusEmoji = '⏸️';
                    if (c.status === 'completed') statusEmoji = '✅';
                    return (
                      <option key={c.id} value={c.id}>
                        {statusEmoji} {c.name} ({c.totalRecipients} targets)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="text-right px-2 md:block hidden">
            <span className="text-[10px] font-bold text-emerald-450 bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-1 rounded-full animate-pulse">
              WASender Connected (Meta Dev Channel)
            </span>
          </div>
        </div>

        {composerView ? (
          /* BROADCAST COMPOSER */
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-100 text-sm">Campaign Setup</h4>
                <button
                  id="ai-enhance-button"
                  onClick={applyAIExtension} 
                  disabled={isGeneratingCopy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                    isGeneratingCopy
                      ? 'bg-slate-800 text-slate-500 border-slate-700'
                      : 'bg-indigo-950/40 text-indigo-400 hover:bg-slate-800 border-indigo-900/60'
                  }`}
                >
                  <Sparkles size={14} className={`text-indigo-455 ${isGeneratingCopy ? 'animate-spin' : 'animate-pulse'}`} /> 
                  {isGeneratingCopy ? 'Generating...' : 'AI Optimize Script'}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Campaign Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Sierra Luxury Towers Launch - Broad Blast"
                  className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp Message Pattern</label>
                  <div className="flex gap-1">
                    <button onClick={() => insertTemplateTag('Name')} className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-900/60 px-1.5 py-0.5 rounded transition-all">
                      + Name
                    </button>
                    <button onClick={() => insertTemplateTag('Property')} className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-900/60 px-1.5 py-0.5 rounded transition-all">
                      + Property
                    </button>
                    <button onClick={() => insertTemplateTag('Price')} className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-900/60 px-1.5 py-0.5 rounded transition-all">
                      + Price
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  placeholder="Draft copy..."
                  className="w-full p-3 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold font-sans text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 block leading-relaxed"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>

              {/* Media URL optional asset selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Attachment Thumbnail URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-example"
                    className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Attachment Title File</label>
                  <input
                    type="text"
                    placeholder="sierra_brochure_v1.pdf"
                    className="w-full p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs font-semibold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={mediaName}
                    onChange={(e) => setMediaName(e.target.value)}
                  />
                </div>
              </div>

              {/* Delays Configuration (Anti-Ban Safety parameters) */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h5 className="text-[11px] font-bold text-slate-300 mb-0.5">WASender Anti-Ban Safety Configuration</h5>
                  <p className="text-[10px] text-slate-500">Inserts randomized pauses to mock authentic human dispatching timers.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-450">Min:</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="w-12 p-1 bg-slate-900 border border-slate-800 text-slate-200 rounded text-center text-xs font-bold font-mono"
                      value={delayMin}
                      onChange={(e) => setDelayMin(Number(e.target.value))}
                    />
                    <span className="text-[10px] text-slate-500">sec</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-450">Max:</span>
                    <input
                      type="number"
                      min={2}
                      max={120}
                      className="w-12 p-1 bg-slate-900 border border-slate-800 text-slate-200 rounded text-center text-xs font-bold font-mono"
                      value={delayMax}
                      onChange={(e) => setDelayMax(Number(e.target.value))}
                    />
                    <span className="text-[10px] text-slate-500">sec</span>
                  </div>
                </div>
              </div>

              {/* Campaign Scheduling Configuration */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-300 mb-0.5">Automated Broadcast Scheduling</h5>
                      <p className="text-[10px] text-slate-500">Pick a specific date and time for when the campaign should automatically initiate.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Schedule?</span>
                    <button
                      type="button"
                      onClick={() => setScheduleEnabled(!scheduleEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        scheduleEnabled ? 'bg-indigo-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          scheduleEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {scheduleEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-905 border-dashed animate-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target Date & Time</label>
                      <input
                        type="datetime-local"
                        className="w-full p-2 bg-slate-900 border border-slate-800 text-slate-300 rounded text-xs font-bold font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status Preview</span>
                      <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-500" /> Planned Release:
                        </span>
                        {scheduledAt ? (
                          (() => {
                            const diff = new Date(scheduledAt).getTime() - currentTimeState;
                            if (diff <= 0) {
                              return <span className="text-rose-455 font-bold">Past date selected!</span>;
                            }
                            const totalSecs = Math.floor(diff / 1000);
                            const hours = Math.floor(totalSecs / 3600);
                            const mins = Math.floor((totalSecs % 3600) / 60);
                            const secs = totalSecs % 60;
                            const countdownStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`;
                            return (
                              <span className="text-indigo-400 font-bold font-mono flex items-center gap-1">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                In {countdownStr}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-slate-500">Not selected yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Recipient Management Area */}
            <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Recipient Blast List ({recipients.length})</h4>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">Designate target numbers and variable names or load pre-loaded client lists.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCSVUploadSimulation}
                  className="text-xs text-emerald-450 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-950 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet size={13} /> Load 3 Mock Leads
                </button>
              </div>

              {/* CSV Upload Feedback Panel */}
              {csvFeedback && (
                <div className={`p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border animate-in slide-in-from-top-1 duration-200 ${
                  csvFeedback.type === 'success' ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400' :
                  csvFeedback.type === 'error' ? 'bg-rose-950/30 border-rose-900/60 text-rose-400' :
                  'bg-indigo-950/30 border-indigo-900/60 text-indigo-400'
                }`}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-sans leading-relaxed">{csvFeedback.text}</p>
                  </div>
                  <button type="button" onClick={() => setCsvFeedback(null)} className="text-slate-500 hover:text-slate-300 ml-1">✕</button>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300 relative ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.01]' 
                    : 'border-slate-800 hover:border-slate-705 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                {/* Hidden Native File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,text/csv,.txt"
                  className="hidden"
                />
                
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className={`p-2.5 rounded-full transition-transform ${isDragging ? 'bg-indigo-500/20 text-indigo-400 scale-110 animate-pulse' : 'bg-slate-900 text-slate-400'}`}>
                    <Upload size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      Drag & Drop CSV list here or <span className="text-indigo-400 hover:underline">Browse files</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-sans">
                      Supports standard <span className="text-slate-400 font-mono">.csv</span> files. Columns list <span className="text-slate-300 font-mono">Name</span>, <span className="text-slate-300 font-mono">Phone</span>, <span className="text-slate-400 font-mono">Property</span>, <span className="text-slate-450 font-mono">Price</span> are mapped automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Utility Bar with Quick template download and Clearing action */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase font-bold text-slate-450 bg-slate-950/40 px-3 py-2 rounded-lg border border-slate-900 border-dashed">
                <span className="flex items-center gap-1.5 font-sans normal-case text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-550 animate-ping"></span>
                  Format structure helper active
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={downloadTemplateCSV}
                    className="text-indigo-400 hover:text-indigo-305 transition-colors tracking-wider text-[9px]"
                  >
                    📥 Download CSV Template
                  </button>
                  <span className="text-slate-800">|</span>
                  <button
                    type="button"
                    onClick={handleClearRecipients}
                    className="text-rose-450 hover:text-rose-400 transition-colors tracking-wider text-[9px] disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={recipients.length === 0}
                  >
                    🗑️ Clear Campaign List
                  </button>
                </div>
              </div>

              {/* Recipient Add Form */}
              <form onSubmit={handleAddRecipient} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs placeholder:text-slate-700 text-slate-200 outline-none focus:border-indigo-500"
                  value={newRecipName}
                  onChange={(e) => setNewRecipName(e.target.value)}
                />
                <input
                  type="text"
                  required
                  placeholder="WhatsApp Mobile"
                  className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs placeholder:text-slate-700 text-slate-200 outline-none focus:border-indigo-500"
                  value={newRecipPhone}
                  onChange={(e) => setNewRecipPhone(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Prop Segment (Villes...)"
                  className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs placeholder:text-slate-700 text-slate-200 outline-none focus:border-indigo-500"
                  value={newRecipProb}
                  onChange={(e) => setNewRecipProb(e.target.value)}
                />
                <div className="flex gap-1.5">
                  <input
                     type="text"
                     placeholder="Price tag..."
                     className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs placeholder:text-slate-700 text-slate-200 outline-none focus:border-indigo-500 flex-1"
                     value={newRecipPrice}
                     onChange={(e) => setNewRecipPrice(e.target.value)}
                  />
                  <button type="submit" className="bg-indigo-600 text-white p-1.5 rounded-md hover:bg-indigo-550 transition-all flex items-center justify-center">
                    <Plus size={14} />
                  </button>
                </div>
              </form>

              {/* Recipient List Table */}
              <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 font-bold text-slate-450 uppercase">
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">WhatsApp Partner</th>
                      <th className="p-2.5">Dynamic Prop</th>
                      <th className="p-2.5 font-mono">Price Ref</th>
                      <th className="p-2.5 text-right">Clear</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                    {recipients.map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-slate-200 font-bold">{rec.name}</td>
                        <td className="p-2.5 font-mono text-emerald-450">{rec.phone}</td>
                        <td className="p-2.5 text-slate-400">{rec.property}</td>
                        <td className="p-2.5 font-mono">{rec.price}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipient(rec.id)}
                            className="text-slate-500 hover:text-rose-500 p-1"
                          >
                            <Trash2 id={`delete-recip-${idx}`} size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Campaign trigger launching CTA */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  id="launch-campaign-button"
                  onClick={handleLaunchCampaign}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 px-6 rounded-lg text-xs leading-none flex items-center gap-2 shadow-lg shadow-indigo-600/10 transition-all font-sans"
                >
                  {scheduleEnabled ? (
                    <>
                      <Calendar size={15} /> SCHEDULE AUTOMATED DISPATCH
                    </>
                  ) : (
                    <>
                      <Send size={15} /> COMPOSE & BROADCAST BULK BLAST
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* TRANSMISSION MONITOR LOGS WITH REAL-TIME FLOW DISPLAY */
          <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-300">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Campaign Active Delivery Monitor</h4>
                  <p className="text-xs text-slate-500">Real-time transmittal records of WhatsApp campaigns.</p>
                </div>

                {activeCampaignId && (() => {
                  const currentCamp = campaigns.find(c => c.id === activeCampaignId);
                  if (!currentCamp || currentCamp.status === 'scheduled') return null;
                  return (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePauseResume}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-white ${
                          isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        {isRunning ? <><Pause size={12} /> Pause Queue</> : <><Play size={12} /> Resume Broadcast</>}
                      </button>
                      {isRunning && (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
 
              {/* Active Campaign Info Banner */}
              {activeCampaign && (
                <div className="bg-slate-950 text-white p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${
                        activeCampaign.status === 'scheduled' ? 'text-indigo-400' :
                        activeCampaign.status === 'completed' ? 'text-emerald-400' : 'text-indigo-300'
                      }`}>
                        {activeCampaign.status === 'scheduled' ? '⏳ Campaign Scheduled' :
                         activeCampaign.status === 'completed' ? '✓ DISPATCH COMPLETED' : '📡 DISPATCHING LIVE STREAM'}
                      </span>
                      <h5 className="text-sm font-bold mt-1 text-slate-200">{activeCampaign.name}</h5>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Delays: {activeCampaign.delayMin}s - {activeCampaign.delayMax}s</span>
                  </div>
 
                  {activeCampaign.status === 'scheduled' ? (
                    <div className="bg-indigo-950/20 border border-indigo-900/45 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h6 className="text-xs font-bold text-indigo-300">Countdown to Automatic Dispatch</h6>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Queue will automatically initiate random transmittals when timer expires.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-indigo-400 font-mono whitespace-nowrap">
                          {getCountdownString(activeCampaign.scheduledAt)}
                        </span>
                        <div className="flex gap-1.5 font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCampaignStatus(activeCampaign.id, 'draft', 0, 0, activeCampaign.recipients);
                              alert('Campaign schedule successfully canceled. Reset to draft.');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold py-1.5 px-3 rounded text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          >
                            Cancel Schedule
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCampaignStatus(
                                activeCampaign.id,
                                'sending',
                                0,
                                0,
                                activeCampaign.recipients.map(r => ({ ...r, status: 'pending' }))
                              );
                              setActiveCampaignId(activeCampaign.id);
                              setCurrentSendingIndex(0);
                              setIsRunning(true);
                              alert('Initiating scheduled campaign immediately!');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-700 text-[10px] font-bold py-1.5 px-3 rounded text-white transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                          >
                            Initiate Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Sending progress numbers */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">TOTAL LEADS</span>
                          <span className="text-lg font-bold block font-mono mt-1 text-slate-300">{activeCampaign.totalRecipients}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase block">✓ SUCCESS</span>
                          <span className="text-lg font-bold block font-mono mt-1 text-emerald-400">{activeCampaign.sentCount}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[10px] text-rose-455 font-bold uppercase block">⚙ FAILS</span>
                          <span className="text-lg font-bold block font-mono mt-1 text-rose-400">{activeCampaign.failedCount}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">PROGRESS RATE</span>
                          <span className="text-lg font-bold block font-mono mt-1 text-indigo-400">
                            {Math.round(((activeCampaign.sentCount + activeCampaign.failedCount) / activeCampaign.totalRecipients) * 100)}%
                          </span>
                        </div>
                      </div>
 
                      {/* Progress Line */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-450">
                          <span>Broadcast status queue</span>
                          <span className="font-mono">{activeCampaign.sentCount + activeCampaign.failedCount} / {activeCampaign.totalRecipients} dispatched</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${((activeCampaign.sentCount + activeCampaign.failedCount) / activeCampaign.totalRecipients) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* History index */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-widest block">Broadcast Logs Table</h5>
                  {activeCampaign && (
                    <button
                      type="button"
                      onClick={handleExportDeliveryReport}
                      className="text-xs text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-900/50 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-left"
                    >
                      <Download size={13} /> Export Delivery Report (CSV)
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 font-bold text-slate-500 uppercase">
                        <th className="p-3">Client Target</th>
                        <th className="p-3">WhatsApp Num</th>
                        <th className="p-3">Property Unit</th>
                        <th className="p-3">Transmission Status</th>
                        <th className="p-3 font-mono text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                      {activeCampaign ? activeCampaign.recipients.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-slate-200">{rec.name}</td>
                          <td className="p-3 font-mono text-slate-350">{rec.phone}</td>
                          <td className="p-3 text-slate-455">{rec.property}</td>
                          <td className="p-3">
                            {rec.status === 'pending' && (
                              <span className="bg-slate-950 text-slate-455 border border-slate-800 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 w-max">
                                <Loader2 size={10} className="animate-spin text-slate-500" /> Pending...
                              </span>
                            )}
                            {rec.status === 'sent' && (
                              <span className="bg-emerald-955/20 text-emerald-400 border border-emerald-900/30 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 w-max">
                                <CheckCheck size={11} className="text-emerald-450" /> ✓ Sent Success
                              </span>
                            )}
                            {rec.status === 'failed' && (
                              <span className="bg-rose-955/20 text-rose-400 border border-rose-900/40 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 w-max" title={rec.errorMessage}>
                                <AlertCircle size={11} className="text-rose-450" /> Blocked Fails
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-right text-slate-500">{rec.sentAt || '--:--'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">No campaigns created yet. Set up a campaign above!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Right panel: Static phone view Live Message Preview (Real WhatsApp Look) */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Smartphone size={16} className="text-slate-400" />
            <h4 className="font-bold text-slate-200 text-sm">Campaign Real-Time Screen</h4>
          </div>

          {/* Styled smartphone shell */}
          <div className="mx-auto max-w-[280px] border-[6px] border-slate-800 bg-[#0f172a] rounded-[2rem] shadow-xl overflow-hidden relative">
            
            {/* Top ear bar */}
            <div className="bg-slate-800 h-6 w-full flex items-center justify-center relative">
              <div className="bg-black h-3.5 w-24 rounded-full relative"></div>
            </div>

            {/* Simulated WhatsApp App bar */}
            <div className="bg-slate-900 text-slate-100 p-3 py-2 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-indigo-400 font-bold text-[10px] flex items-center justify-center border border-slate-700">
                  🏢
                </div>
                <div>
                  <h5 className="text-[11px] font-bold leading-none">Ahmed Fawzy (Sierra)</h5>
                  <span className="text-[8px] text-emerald-400 leading-none block mt-0.5">Online</span>
                </div>
              </div>
              <div className="flex gap-2 text-slate-400">
                <span className="text-[10px] font-bold font-mono">12:00</span>
              </div>
            </div>

            {/* Chat Body Bubble Screen */}
            <div className="p-3 space-y-3 min-h-[340px] max-h-[340px] overflow-y-auto bg-slate-950">
              {recipients.length > 0 && (
                <div className="bg-emerald-950/80 p-2.5 rounded-lg rounded-tr-none shadow-sm text-[11px] text-emerald-100 ml-6 relative border border-emerald-900/40">
                  
                  {/* Thumbnail attachment if loaded */}
                  {mediaUrl ? (
                    <div className="mb-2 rounded overflow-hidden border border-emerald-900/40 bg-slate-950">
                      <img referrerPolicy="no-referrer" src={mediaUrl} className="w-full h-24 object-cover" alt="campaign attachment" />
                      <div className="p-1 px-1.5 bg-slate-900 text-[9px] font-semibold text-slate-400 truncate">{mediaName || 'attachment.pdf'}</div>
                    </div>
                  ) : (
                    <div className="mb-2 rounded border border-emerald-900/50 bg-slate-900 p-1.5 flex items-center gap-2">
                      <FileSpreadsheet className="text-emerald-450" size={16} />
                      <div className="max-w-40">
                        <p className="text-[9px] font-bold leading-none truncate text-emerald-100">Sierra Luxury Townhouses</p>
                        <span className="text-[7px] text-emerald-400 block truncate">1.2 MB PDF brochure</span>
                      </div>
                    </div>
                  )}

                  <p className="whitespace-pre-line leading-relaxed">
                    {getRenderedMessage(messageText, recipients[0])}
                  </p>
                  
                  <div className="text-right text-[8px] text-emerald-450 font-mono mt-1 flex justify-end items-center gap-0.5">
                    <span>12:45 PM</span>
                    <CheckCheck size={11} className="text-[#34B7F1]" />
                  </div>
                </div>
              )}

              {/* Simulated Customer Reply Bubbles */}
              <div className="bg-slate-900 p-2.5 rounded-lg rounded-tl-none shadow-sm text-[11px] text-slate-300 mr-6 relative border border-slate-800">
                <p className="leading-relaxed font-semibold text-indigo-400 block text-[9px] mb-0.5">Karim Abdelaziz</p>
                <p className="leading-relaxed text-slate-200">I am interested! Can we schedule a property viewing?</p>
                <div className="text-right text-[8px] text-slate-500 font-mono mt-1">12:46 PM</div>
              </div>
            </div>

            {/* WhatsApp Typing Bar */}
            <div className="bg-slate-900 p-2 flex items-center gap-1.5 border-t border-slate-800">
              <input 
                type="text" 
                disabled
                placeholder="Type message..." 
                className="bg-slate-950 rounded-full p-1.5 px-3 uppercase text-[9px] font-semibold flex-1 outline-none text-slate-600"
              />
              <button disabled className="bg-indigo-600 text-white p-1.5 rounded-full opacity-50">
                <Send size={10} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" id="campaign-confirm-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
            
            {/* Header containing icon */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Confirm Bulk Broadcast Blast</h3>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">Please verify campaign telemetry before dispatching.</p>
              </div>
            </div>

            {/* Campaign specs lists */}
            <div className="space-y-3.5 mb-5 text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Campaign Name:</span>
                  <span className="font-bold text-slate-200 truncate max-w-[200px]" title={campaignName}>{campaignName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Target Audience:</span>
                  <span className="font-mono text-emerald-400 font-bold">{recipients.length} WhatsApp Contacts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Blast Timing:</span>
                  <span className="font-bold text-indigo-400">
                    {scheduleEnabled ? `Scheduled: ${new Date(scheduledAt).toLocaleString()}` : "Immediate Dispatch"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Safety Delays:</span>
                  <span className="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Randomized {delayMin}s - {delayMax}s
                  </span>
                </div>
              </div>

              {/* Draft message excerpt preview box */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sample Template Preview:</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/80 text-[11px] font-sans text-slate-400 max-h-24 overflow-y-auto leading-relaxed whitespace-pre-wrap italic">
                  {messageText || '(Empty message body content)'}
                </div>
              </div>

              {/* Prompt/warning of accidental click */}
              <div className="bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg flex gap-2 text-[11px] text-amber-200 leading-normal font-sans">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                <p>
                  <strong>Accidental trigger prevention:</strong> Once you initiate this campaign, messages will start broadcasting to real customer records according to delay configurations. This cannot be instantly undone.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-250 text-xs font-bold rounded-lg transition-all"
              >
                Cancel and Revise
              </button>
              <button
                type="button"
                onClick={executeCampaignLaunch}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/10 transition-all flex items-center gap-1.5"
                id="modal-confirm-start-button"
              >
                <Check size={14} /> Confirm & Start Campaign
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
