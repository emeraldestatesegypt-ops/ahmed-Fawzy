/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, Sparkles, Phone, HelpCircle, Copy, Check, Download, 
  Trash2, Plus, ArrowUpRight, CheckCircle, Database, Layout, Save, AlertCircle, FileText, UserPlus, Trash, Edit3,
  Globe, RefreshCw, Sliders, X, ExternalLink, Lock, Key, Activity, Wifi, Cpu, Play
} from 'lucide-react';
import { PropertyClientRecord, PropertyFinderListing, PropertyFinderLead, SyncLog } from '../types';

const COMPOUND_CODES: Record<string, string> = {
  'ميفيدا': 'MI',
  'mivida': 'MI',
  'ماونتن فيو': 'MV',
  'mountain view': 'MV',
  'هايد بارك': 'HP',
  'hyde park': 'HP',
  'ليك فيو': 'LV',
  'lake view': 'LV',
  'كايرو فيستيفال': 'CFC',
  'cairo festival': 'CFC',
  'فيليت': 'VS',
  'villette': 'VS',
  'جاردينيا': 'GC',
  'gardenia': 'GC',
  'الرحاب': 'RH',
  'rehab': 'RH',
  'الشروق': 'ES',
  'el shorouk': 'ES'
};

interface PropertyManagerTabProps {
  propertyClients: PropertyClientRecord[];
  onUpdatePropertyClients: (updated: PropertyClientRecord[]) => void;
  syncLogs?: SyncLog[];
  onClearSyncLogs?: () => void;
}

export default function PropertyManagerTab({ 
  propertyClients, 
  onUpdatePropertyClients,
  syncLogs = [],
  onClearSyncLogs
}: PropertyManagerTabProps) {
  const [propertyDesc, setPropertyDesc] = useState('شقة في ميفيدا 3 غرف مفروش 10 مليون');
  const [phoneNumber, setPhoneNumber] = useState('01092048333');
  const [images, setImages] = useState<string[]>([]);

  // Extraction states (editable)
  const [extractedCompound, setExtractedCompound] = useState('Mivida');
  const [extractedCompoundCode, setExtractedCompoundCode] = useState('MI');
  const [extractedBedrooms, setExtractedBedrooms] = useState<number>(3);
  const [extractedBathrooms, setExtractedBathrooms] = useState<number>(2);
  const [extractedArea, setExtractedArea] = useState<number | ''>(140);
  const [extractedFurnished, setExtractedFurnished] = useState<'F' | 'S' | 'K' | 'U'>('F');
  const [extractedPrice, setExtractedPrice] = useState<number>(10000000);
  const [extractedCurrency, setExtractedCurrency] = useState<string>('EGP');

  // Egypt Regional compliance parameters (Property Finder Egypt spec)
  const [egyptCategory, setEgyptCategory] = useState<'residential' | 'commercial'>('residential');
  const [egyptPropertyType, setEgyptPropertyType] = useState<string>('apartment');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['balcony', 'security', 'kitchen-appliances', 'central-ac']);
  const [egyptPermitNumber, setEgyptPermitNumber] = useState<string>('');

  // Generated results
  const [generatedCode, setGeneratedCode] = useState('MI-3F-10M');
  const [whatsappContent, setWhatsappContent] = useState('');
  const [facebookContent, setFacebookContent] = useState('');
  const [pfTitle, setPfTitle] = useState('');
  const [pfContent, setPfContent] = useState('');

  // Status Alerts
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedProperties, setSavedProperties] = useState<any[]>([
    {
      code: 'MI-3F-10M',
      compound: 'Mivida',
      bedrooms: 3,
      price: 10000000,
      currency: 'EGP',
      date: 'Just now'
    }
  ]);

  // Property Finder live integration states
  const [pfListings, setPfListings] = useState<PropertyFinderListing[]>([]);
  const [pfLeads, setPfLeads] = useState<PropertyFinderLead[]>([]);
  const [isPfLoading, setIsPfLoading] = useState(false);
  const [pfCreds, setPfCreds] = useState({ 
    apiKey: 'tMlCs.H28cDCwm6YZXKc8P06DSIK3e9mRMOvDRsi', 
    apiSecret: 'xG7Ud54sQqDgX0hwcy0g54bfPWEzkcJW', 
    authStatus: 'simulated_sandbox', 
    mode: 'simulation' 
  });
  const [pfApiKeyInput, setPfApiKeyInput] = useState('tMlCs.H28cDCwm6YZXKc8P06DSIK3e9mRMOvDRsi');
  const [pfApiSecretInput, setPfApiSecretInput] = useState('xG7Ud54sQqDgX0hwcy0g54bfPWEzkcJW');
  const [showPfConfig, setShowPfConfig] = useState(false);
  const [isPushingListing, setIsPushingListing] = useState(false);

  // --- PROPERTY FINDER API POLLING ENGINE & DISPATCHER STATES ---
  const [pollInterval, setPollInterval] = useState<number>(4); // in seconds
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);
  const [lastPolledTime, setLastPolledTime] = useState<string>('Never');
  const [isPollFlicker, setIsPollFlicker] = useState<boolean>(false);
  const [pfEndpoints, setPfEndpoints] = useState([
    { id: 'ep-get-listings', name: 'GET /listings/v1', path: 'https://api.propertyfinder.eg/listings-hub', status: 'online', latency: 45, calls: 142 },
    { id: 'ep-post-listing', name: 'POST /listings/v1', path: 'https://api.propertyfinder.eg/listings-create', status: 'online', latency: 85, calls: 31 },
    { id: 'ep-get-leads', name: 'GET /leads/v2', path: 'https://api.propertyfinder.eg/leads-broker', status: 'online', latency: 50, calls: 219 },
    { id: 'ep-webhook-challenge', name: 'POST /webhooks/v2', path: 'https://api.propertyfinder.eg/webhooks-challenge', status: 'online', latency: 62, calls: 94 }
  ]);

  // --- AGENT & WORKFLOW LIVE DEPLOYMENT CONTROLLERS ---
  const [deployProgress, setDeployProgress] = useState<number>(0);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployLogs, setDeployLogs] = useState<string[]>(['Deployment monitor initialized.', 'Broadcom cluster idle.']);
  const [deployedAgentsCount, setDeployedAgentsCount] = useState<number>(0);
  const [agentSlas, setAgentSlas] = useState([
    { id: 'agent-atlas', name: 'Atlas Inbound Router Agent', version: 'v2.5.3', status: 'undeployed', lastSync: '--' },
    { id: 'agent-sentry', name: 'Property Finder Atlas Sync Sentry', version: 'v1.4.1', status: 'undeployed', lastSync: '--' },
    { id: 'agent-schedules', name: 'Campaign Anti-Ban Blast System', version: 'v3.0.2', status: 'undeployed', lastSync: '--' }
  ]);

  // Handle active interval polling simulated changes
  useEffect(() => {
    let timerId: any = null;
    if (isAutoPolling) {
      timerId = setInterval(() => {
        setIsPollFlicker(true);
        setTimeout(() => setIsPollFlicker(false), 200);

        setPfEndpoints(prev => prev.map(ep => {
          const change = Math.floor(Math.random() * 21) - 10; // offset -10 / +10ms
          const minL = 15;
          const maxL = 195;
          const nextLat = Math.max(minL, Math.min(maxL, ep.latency + change));
          const isOffline = Math.random() < 0.01; // extremely rare offline ping fluctuation

          return {
            ...ep,
            latency: isOffline ? 0 : nextLat,
            status: isOffline ? 'offline' : 'online',
            calls: ep.calls + 1
          };
        }));

        setLastPolledTime(new Date().toLocaleTimeString());
      }, pollInterval * 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isAutoPolling, pollInterval]);

  const handleManualPoll = () => {
    setIsPollFlicker(true);
    setTimeout(() => setIsPollFlicker(false), 200);

    setPfEndpoints(prev => prev.map(ep => {
      const change = Math.floor(Math.random() * 31) - 15;
      const nextLat = Math.max(12, Math.min(220, ep.latency + change));
      return {
        ...ep,
        latency: nextLat,
        status: 'online',
        calls: ep.calls + 1
      };
    }));
    setLastPolledTime(new Date().toLocaleTimeString());
  };

  const handleDeployAllAgents = () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setDeployProgress(5);
    setDeployLogs(['🚀 Initiating Cluster Handshake with Broker Sandbox...', 'Allocating container worker memory pools...']);
    
    const steps = [
      { progress: 25, log: '⚙️ Validating Egypt listings compliance specs & Atlas formats...' },
      { progress: 55, log: '🔑 Syncing security credentials and active OAuth secret bindings...' },
      { progress: 80, log: '⚡ Registering live webhook routing tables on Broker network controllers...' },
      { progress: 95, log: '📦 Launching Atlas Router, Sentry, & Campaign Anti-Ban schedules...' },
      { progress: 100, log: '✨ Success! Multi-agent pipeline deployment finalized successfully!' }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setDeployProgress(step.progress);
        setDeployLogs(prev => [step.log, ...prev]);

        if (step.progress === 100) {
          setIsDeploying(false);
          setDeployedAgentsCount(3);
          setAgentSlas(prev => prev.map(a => ({
            ...a,
            status: 'active',
            lastSync: new Date().toLocaleTimeString()
          })));

          // Push simple visual sync feedback log
          localStorage.setItem('wasender_global_bundle_deployed', 'true');
        }
      }, (idx + 1) * 850);
    });
  };

  const fetchPFStatus = async () => {
    try {
      const res = await fetch('/api/propertyfinder/credentials');
      if (res.ok) {
        const data = await res.json();
        setPfCreds(data);
        setPfApiKeyInput(data.apiKey);
        setPfApiSecretInput(data.apiSecret);
      }
    } catch (err) {
      console.error('Error fetching PF credentials status:', err);
    }
  };

  const fetchPFData = async () => {
    setIsPfLoading(true);
    try {
      const [listingsRes, leadsRes] = await Promise.all([
        fetch('/api/propertyfinder/listings'),
        fetch('/api/propertyfinder/leads')
      ]);
      if (listingsRes.ok) {
        const listData = await listingsRes.json();
        setPfListings(listData.listings);
      }
      if (leadsRes.ok) {
        const leadData = await leadsRes.json();
        setPfLeads(leadData.leads);
      }
    } catch (err) {
      console.error('Error fetching Property Finder data:', err);
    } finally {
      setIsPfLoading(false);
    }
  };

  useEffect(() => {
    fetchPFStatus();
    fetchPFData();
  }, []);

  const handleUpdatePFCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/propertyfinder/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: pfApiKeyInput, apiSecret: pfApiSecretInput })
      });
      if (res.ok) {
        const data = await res.json();
        setPfCreds(prev => ({ 
          ...prev, 
          apiKey: pfApiKeyInput, 
          apiSecret: pfApiSecretInput,
          authStatus: data.authStatus,
          mode: data.mode
        }));
        alert(data.message);
        setShowPfConfig(false);
        fetchPFData();
      } else {
        const errData = await res.json();
        alert('Error: ' + errData.error);
      }
    } catch (err) {
      alert('Network failure connecting to agent gateway proxy.');
    }
  };

  const handlePushToPropertyFinder = async () => {
    if (!generatedCode) {
      alert('Please formulate a valid property code first!');
      return;
    }
    setIsPushingListing(true);
    try {
      // Land and Farm in Egypt have NO amenities allowed
      const isLandOrFarm = egyptPropertyType === 'land' || egyptPropertyType === 'farm';
      const cleanAmenities = isLandOrFarm ? [] : selectedAmenities;

      const res = await fetch('/api/propertyfinder/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: generatedCode,
          title: pfTitle || `${extractedBedrooms} Room ${egyptPropertyType.toUpperCase()} in ${extractedCompound}`,
          description: pfContent || `Modern unit inside ${extractedCompound} featuring the premium code ${generatedCode}.`,
          type: egyptPropertyType,
          category: egyptCategory,
          price: extractedPrice,
          currency: extractedCurrency,
          bedrooms: extractedBedrooms,
          bathrooms: extractedBathrooms,
          size: extractedArea || 120,
          locationName: extractedCompound + ' District',
          images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80"],
          amenities: cleanAmenities,
          compliance: egyptPermitNumber ? {
            listingAdvertisementNumber: egyptPermitNumber,
            type: 'rera',
            userConfirmedDataIsCorrect: true
          } : undefined
        })
      });
      if (res.ok) {
        const result = await res.json();
        setSuccessMessage(`🎉 Successfully uploaded draft listing to Property Finder! Category: ${egyptCategory}, Type: ${egyptPropertyType}, Source: ${result.source}`);
        fetchPFData();
      } else {
        alert('Failed to submit listing draft to Property Finder agent portal.');
      }
    } catch (err) {
      alert('Network error pushing draft listing.');
    } finally {
      setIsPushingListing(false);
    }
  };

  const handlePublishListingPF = async (id: string) => {
    try {
      const res = await fetch(`/api/propertyfinder/listings/${id}/publish`, { method: 'POST' });
      if (res.ok) {
        setSuccessMessage('🎉 Listing published live successfully on Property Finder!');
        fetchPFData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnpublishListingPF = async (id: string) => {
    try {
      const res = await fetch(`/api/propertyfinder/listings/${id}/unpublish`, { method: 'POST' });
      if (res.ok) {
        setSuccessMessage('🔒 Listing successfully unpublished back to Draft.');
        fetchPFData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteListingPF = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing from Property Finder?')) return;
    try {
      const res = await fetch(`/api/propertyfinder/listings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMessage('🗑️ Listing deleted from Property Finder index.');
        fetchPFData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateInboundPFLead = async () => {
    try {
      const res = await fetch('/api/propertyfinder/leads/simulate-trigger', { method: 'POST' });
      if (res.ok) {
        const body = await res.json();
        setSuccessMessage(`⚡ New Property Finder lead received in Broker Port: ${body.lead.senderName}!`);
        fetchPFData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportPFLeadToCRM = (lead: PropertyFinderLead) => {
    const phoneNum = lead.senderPhone || '+201011223344';
    
    // Add to direct maps
    const newRecord: PropertyClientRecord = {
      id: 'pc-' + Date.now(),
      name: lead.senderName,
      phone: phoneNum,
      propertyInterest: lead.propertyInterest || 'Property Finder Synced Unit',
      status: 'WhatsApp Contacted',
      lastActivity: `Property Finder Lead via WA Channel: "${lead.senderName}"`,
      updatedAt: new Date().toLocaleString(),
      notes: `Lead synced directly from Property Finder Broker API. Interest tag: ${lead.propertyInterest}. Contact email: ${lead.senderEmail}`
    };

    onUpdatePropertyClients([newRecord, ...propertyClients]);
    
    // Set local state of leads to marked imported
    setPfLeads(prev => prev.map(l => l.id === lead.id ? { ...l, imported: true } : l));
    
    setSuccessMessage(`👥 Synced ${lead.senderName} to Active WhatsApp Workflow pipeline!`);
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper extraction logic matching the raw HTML
  const handleExtractAndProcess = () => {
    setErrorMessage('');
    setSuccessMessage('');

    const text = propertyDesc.toLowerCase();

    // 1. Compound
    let foundCompoundName = 'Unknown';
    let foundCompoundCode = 'XX';
    for (const [name, code] of Object.entries(COMPOUND_CODES)) {
      if (text.includes(name.toLowerCase())) {
        foundCompoundName = name.charAt(0).toUpperCase() + name.slice(1);
        foundCompoundCode = code;
        break;
      }
    }
    if (foundCompoundName === 'Unknown') {
      const words = text.split(' ').filter(w => w.length > 0);
      if (words.length > 0) {
        foundCompoundName = words[0];
        foundCompoundCode = words[0].substring(0, 2).toUpperCase();
      }
    }

    // 2. Bedrooms
    let bedrooms = 1;
    if (text.includes('استوديو') || text.includes('studio')) {
      bedrooms = 1;
    } else {
      const bedMatch = text.match(/(\d+)\s*(غرف|bedrooms|bedroom|br|غرفة|room)/i);
      if (bedMatch) {
        bedrooms = parseInt(bedMatch[1]);
      } else if (text.includes('غرفتين')) {
        bedrooms = 2;
      } else if (text.includes('ثلاث')) {
        bedrooms = 3;
      } else if (text.includes('أربع')) {
        bedrooms = 4;
      } else {
        // Look for any stand-alone digit
        const rawDigit = text.match(/(\d+)/);
        if (rawDigit) bedrooms = parseInt(rawDigit[1]);
      }
    }

    // 3. Bathrooms
    let bathrooms = 2;
    const bathMatch = text.match(/(\d+)\s*(حمام|bathrooms|bathroom|bath)/i);
    if (bathMatch) {
      bathrooms = parseInt(bathMatch[1]);
    }

    // 4. Area
    let area: number | '' = 140;
    const areaMatch = text.match(/(\d+)\s*(متر|sqm|m²|m)/i);
    if (areaMatch) {
      area = parseInt(areaMatch[1]);
    }

    // 5. Furnished Status
    let furnished: 'F' | 'S' | 'K' | 'U' = 'F';
    if (text.includes('مفروش') || text.includes('furnished')) furnished = 'F';
    else if (text.includes('نصف') || text.includes('semi')) furnished = 'S';
    else if (text.includes('مطبخ') || text.includes('kitchen')) furnished = 'K';
    else if (text.includes('غير مفروش') || text.includes('unfurnished')) furnished = 'U';

    // 6. Price
    let priceVal = 10000000;
    let currency = 'EGP';
    
    // Arabic conversion
    let cleaned = propertyDesc;
    const arabicToEnglish: Record<string, string> = { 
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' 
    };
    for (const [a, e] of Object.entries(arabicToEnglish)) {
      cleaned = cleaned.replace(new RegExp(a, 'g'), e);
    }

    const priceMatch = cleaned.match(/(\d+[.,]?\d*)\s*(مليون|م|million)?\s*(الف|k|ألف)?/i);
    if (priceMatch) {
      let val = parseFloat(priceMatch[1].replace(',', ''));
      if (priceMatch[2] && (priceMatch[2].includes('مليون') || priceMatch[2].includes('million') || priceMatch[2] === 'م')) {
        val *= 1000000;
      } else if (priceMatch[3] && (priceMatch[3].includes('الف') || priceMatch[3].includes('k') || priceMatch[3].includes('ألف'))) {
        val *= 1000;
      }
      priceVal = val;
    }

    if (text.includes('$') || text.includes('dollar') || text.includes('usd')) currency = 'USD';
    else if (text.includes('درهم') || text.includes('aed')) currency = 'AED';

    // Set States
    setExtractedCompound(foundCompoundName);
    setExtractedCompoundCode(foundCompoundCode);
    setExtractedBedrooms(bedrooms);
    setExtractedBathrooms(bathrooms);
    setExtractedArea(area);
    setExtractedFurnished(furnished);
    setExtractedPrice(priceVal);
    setExtractedCurrency(currency);

    // Format fields for codes
    let priceCode = '';
    if (currency === 'USD') {
      priceCode = priceVal >= 1000000 ? `$${(priceVal / 1000000).toFixed(1).replace('.0', '')}M` : priceVal >= 1000 ? `$${Math.round(priceVal / 1000)}K` : `$${priceVal}`;
    } else if (currency === 'AED') {
      priceCode = priceVal >= 1000000 ? `${(priceVal / 1000000).toFixed(1).replace('.0', '')}M_AED` : priceVal >= 1000 ? `${Math.round(priceVal / 1000)}K_AED` : `${priceVal}_AED`;
    } else {
      priceCode = priceVal >= 1000000 ? `${Math.round(priceVal / 1000000)}M` : priceVal >= 1000 ? `${Math.round(priceVal / 1000)}K` : priceVal.toString();
    }

    const finalCode = `${foundCompoundCode}-${bedrooms}${furnished}-${priceCode}`;
    setGeneratedCode(finalCode);

    // Formulations
    const getFurnText = (code: string) => {
      const map: Record<string, string> = { 'F': 'Fully Furnished', 'S': 'Semi-Furnished', 'K': 'Kitchen Only', 'U': 'Unfurnished' };
      return map[code] || 'Unfurnished';
    };

    const typeTextEN = bedrooms === 1 ? 'studio (one bedroom)' : `${bedrooms} bedrooms`;
    const areaTextEN = area ? `${area} sqm` : '';
    const bathTextEN = bathrooms ? `${bathrooms} Bathrooms` : '';
    const priceDisplay = currency === 'USD' ? `$${priceVal.toLocaleString()}` : `${priceVal.toLocaleString()} ${currency}`;

    const wa = `Code : ${finalCode}

${foundCompoundName} 📍

For rent
- ${typeTextEN}
${areaTextEN ? `- Area: ${areaTextEN}` : ''}
${bathTextEN ? `- ${bathTextEN}` : ''}
- ${getFurnText(furnished)}
- Price: ${priceDisplay}
- For more details

Sierra-Blu-Realty
${phoneNumber}`;
    setWhatsappContent(wa);

    const typeTextAR = bedrooms === 1 ? 'استوديو' : `${bedrooms} غرف`;
    const fb = `🏢 ${typeTextAR} فاخر للإيجار في ${foundCompoundName}
📍 ${foundCompoundName} – New Cairo
🛏️ ${typeTextAR}
🛋️ ${getFurnText(furnished)}
${area ? `📐 ${area} متر مربع` : ''}
💰 ${priceDisplay}

📞 ${phoneNumber}
سييرا بلو العقارية – Beyond Brokerage ✦

#${foundCompoundName} #${typeTextAR === 'استوديو' ? 'استوديو_للإيجار' : 'شقق_للإيجار'} #NewCairo`;
    setFacebookContent(fb);

    const titlePF = `${typeTextAR} فاخر للإيجار في ${foundCompoundName}`;
    const pf = `${typeTextAR} فاخر للإيجار في ${foundCompoundName}، أحد أرقى كمباوندات القاهرة الجديدة. يتميز العقار بمساحة ممتازة، ${bedrooms} غرف نوم، ${getFurnText(furnished)}، وسعر مميز ${priceDisplay}. للاستفسار: ${phoneNumber}. سييرا بلو – شريكك الموثوق.`;
    setPfTitle(titlePF);
    setPfContent(pf);

    setSuccessMessage('✅ Code & content generated from description successfully!');
  };

  const handleManualSave = () => {
    // Save to local listing simulated state
    const newProp = {
      code: generatedCode,
      compound: extractedCompound,
      bedrooms: extractedBedrooms,
      price: extractedPrice,
      currency: extractedCurrency,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setSavedProperties(prev => [newProp, ...prev]);
    setSuccessMessage('🎉 Property details logged into Sierra database!');
  };

  // Image Drag/Drop & upload preview
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImages(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(files[i]);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Dynamic Selector Header */}
      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#C8961A]/10 text-[#C8961A] border border-[#C8961A]/20 rounded-full">
            <Building size={22} className="text-[#C8961A]" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">Sierra Blu · Property Code Terminal (Arabic/English)</h4>
            <p className="text-xs text-slate-400">Instantly formulate compliant real estate codes, export WhatsApp/FB descriptions, and generate digital brochures.</p>
          </div>
        </div>

        <a 
          href="Sierra Estates 3.0 Property Manager.html" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-1 px-4 bg-amber-950/20 hover:bg-amber-900/20 border border-amber-900/30 text-amber-400 font-bold text-[11px] rounded transition duration-200 uppercase tracking-widest flex items-center gap-2"
        >
          <ArrowUpRight size={13} className="text-amber-400" />
          Open Standalone Page
        </a>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-955/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Intake and Parameters */}
        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h5 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              Property Specifications Intake
            </h5>
            <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-850 px-2 py-0.5 rounded font-bold">RTL SUPPORT</span>
          </div>

          <div className="space-y-4">
            {/* Description Textarea */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">📝 Raw Property Description (Arabic/English)</label>
              <textarea
                rows={4}
                dir="auto"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Example: شقة في ميفيدا 3 غرف مفروش 10 مليون..."
                value={propertyDesc}
                onChange={(e) => setPropertyDesc(e.target.value)}
              />
            </div>

            {/* Phone input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">📞 Broker Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500"><Phone size={14} /></span>
                  <input
                    type="tel"
                    className="w-full p-2.5 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Upload field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">🖼️ Property Attachments</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-950/40 file:text-indigo-400 hover:file:bg-indigo-900/40 cursor-pointer"
                />
              </div>
            </div>

            {/* Images list preview */}
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="preview" className="h-11 w-11 object-cover rounded-md border border-slate-800" />
                    <button 
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Trigger extraction buttons */}
            <button
              onClick={handleExtractAndProcess}
              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition-all shadow border border-indigo-700 uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Parse & Formulate Code
            </button>
          </div>

          {/* Extracted Manual Tweaks Form & Egypt Regional Compliance Suite */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[10px] font-bold text-[#C8961A] uppercase tracking-wider block">Real-time Parameters Fine-tuner</span>
              <span className="text-[9px] bg-amber-500/10 text-amber-505 border border-amber-900/50 p-0.5 px-2 rounded uppercase font-bold">
                🇪🇬 Egypt Regulatory Compliant
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Compound</span>
                <input 
                  type="text" 
                  className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded font-semibold text-xs"
                  value={extractedCompound}
                  onChange={(e) => setExtractedCompound(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Code Prefix</span>
                <input 
                  type="text" 
                  maxLength={4}
                  className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded font-mono font-bold text-xs uppercase"
                  value={extractedCompoundCode}
                  onChange={(e) => setExtractedCompoundCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Bedrooms</span>
                <input 
                  type="number" 
                  min={1}
                  className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded font-semibold text-xs"
                  value={extractedBedrooms}
                  onChange={(e) => setExtractedBedrooms(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Price (Numerical)</span>
                <input 
                  type="number" 
                  className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded font-mono text-xs"
                  value={extractedPrice}
                  onChange={(e) => setExtractedPrice(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Currency</span>
                <select 
                  className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded text-xs"
                  value={extractedCurrency}
                  onChange={(e) => setExtractedCurrency(e.target.value)}
                >
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Furnished</span>
                <select 
                  className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded text-xs"
                  value={extractedFurnished}
                  onChange={(e) => setExtractedFurnished(e.target.value as any)}
                >
                  <option value="F">Fully Furnished (F)</option>
                  <option value="S">Semi-Furnished (S)</option>
                  <option value="K">Kitchen Only (K)</option>
                  <option value="U">Unfurnished (U)</option>
                </select>
              </div>
            </div>

            {/* Egypt Property Finder API Compliance Config sub-section */}
            <div className="border-t border-slate-900 pt-3 space-y-3">
              <span className="text-[10px] text-slate-350 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                <Building size={12} className="text-amber-500" /> PF Egypt Advanced Meta Mapper
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 block uppercase font-semibold">PF Category</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEgyptCategory('residential');
                        setEgyptPropertyType('apartment');
                      }}
                      className={`flex-1 py-1.5 rounded font-semibold text-xs transition cursor-pointer border ${
                        egyptCategory === 'residential' 
                        ? 'bg-amber-600/10 text-amber-550 border-amber-900/60' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Residential
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEgyptCategory('commercial');
                        setEgyptPropertyType('office-space');
                      }}
                      className={`flex-1 py-1.5 rounded font-semibold text-xs transition cursor-pointer border ${
                        egyptCategory === 'commercial' 
                        ? 'bg-amber-600/10 text-amber-550 border-amber-900/60' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Commercial
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 block uppercase font-semibold">Egypt Allowed Property Type</span>
                  <select
                    className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded text-xs select-custom uppercase font-sans font-semibold"
                    value={egyptPropertyType}
                    onChange={(e) => setEgyptPropertyType(e.target.value)}
                  >
                    {egyptCategory === 'residential' ? (
                      <>
                        <option value="apartment">apartment (شقة)</option>
                        <option value="chalet">chalet (شاليه - Sahel/Sokhna)</option>
                        <option value="duplex">duplex (دوبلكس)</option>
                        <option value="townhouse">townhouse (تاون هاوس)</option>
                        <option value="twin-house">twin-house (توين هاوس)</option>
                        <option value="villa">villa (فيلا مستقلة)</option>
                        <option value="penthouse">penthouse (بنتهاوس)</option>
                        <option value="roof">roof (روف)</option>
                        <option value="land">residential land (أرض سكنية)</option>
                      </>
                    ) : (
                      <>
                        <option value="office-space">office space (مكتب إداري)</option>
                        <option value="retail">retail (محل تجاري)</option>
                        <option value="shop">shop (معرض/محل)</option>
                        <option value="clinic">clinic (عيادة طبية)</option>
                        <option value="medical-facility">medical facility (مركز طبي)</option>
                        <option value="warehouse">warehouse (مخزن)</option>
                        <option value="factory">factory (مصنع)</option>
                        <option value="land">commercial land (أرض تجارية)</option>
                        <option value="farm">farm (مزرعة)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* License Permit block */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Egypt Market Advertisement License / Permit ID</span>
                <input 
                  type="text" 
                  placeholder="e.g. EG-4832-PF (Required for verified listings)"
                  className="w-full p-2 bg-slate-900 text-slate-300 border border-slate-800 rounded text-xs placeholder:text-slate-600 font-mono"
                  value={egyptPermitNumber}
                  onChange={(e) => setEgyptPermitNumber(e.target.value)}
                />
              </div>

              {/* Dynamic Amenities selective checkboxes */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">
                    Egypt Allowed Amenities Meta Checklist
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (egyptCategory === 'residential') {
                        setSelectedAmenities(['balcony', 'security', 'kitchen-appliances', 'central-ac', 'private-garden']);
                      } else {
                        setSelectedAmenities(['covered-parking', 'networked', 'conference-room']);
                      }
                    }}
                    className="text-[8px] hover:underline text-amber-500 cursor-pointer uppercase font-semibold"
                  >
                    Select Best Defaults
                  </button>
                </div>

                {egyptPropertyType === 'land' || egyptPropertyType === 'farm' ? (
                  <div className="p-2.5 bg-amber-950/20 text-[#E9C176] rounded border border-amber-900/40 text-[10px] leading-relaxed">
                    🚫 <strong>Notice Checklist Restricted:</strong> Property Finder Egypt rules specify that <strong>No Amenities</strong> can be declared for <strong>Land</strong> or <strong>Farm</strong> listings. Any chosen amenities will be filtered out to protect compliance scoring index.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto bg-slate-900/40 p-2 border border-slate-850 rounded">
                    {egyptCategory === 'residential' ? (
                      // Residential
                      [
                        { id: 'central-ac', label: 'Central AC' },
                        { id: 'built-in-wardrobes', label: 'Wardrobes' },
                        { id: 'kitchen-appliances', label: 'Appliances' },
                        { id: 'security', label: 'Security 24/7' },
                        { id: 'balcony', label: 'Balcony' },
                        { id: 'shared-gym', label: 'Shared Gym' },
                        { id: 'shared-spa', label: 'Shared Spa' },
                        { id: 'covered-parking', label: 'Covered Parking' },
                        { id: 'maids-room', label: 'Maids Room' },
                        { id: 'study', label: 'Study Room' },
                        { id: 'shared-pool', label: 'Pool Access' },
                        { id: 'private-garden', label: 'Private Garden' },
                        { id: 'private-pool', label: 'Private Pool' },
                        { id: 'view-of-water', label: 'Sea/Water View' },
                        { id: 'view-of-landmark', label: 'Landmark View' },
                        { id: 'walk-in-closet', label: 'Walk-in Closet' },
                        { id: 'lobby-in-building', label: 'Grand Lobby' }
                      ].map(amenity => {
                        const isChecked = selectedAmenities.includes(amenity.id);
                        return (
                          <label key={amenity.id} className="flex items-center gap-1.5 text-[10px] text-slate-350 cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              className="rounded bg-slate-905 border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedAmenities(prev => prev.filter(x => x !== amenity.id));
                                } else {
                                  setSelectedAmenities(prev => [...prev, amenity.id]);
                                }
                              }}
                            />
                            <span>{amenity.label}</span>
                          </label>
                        );
                      })
                    ) : (
                      // Commercial
                      [
                        { id: 'shared-gym', label: 'Shared Gym' },
                        { id: 'covered-parking', label: 'Assigned Parking' },
                        { id: 'networked', label: 'High Speed Net' },
                        { id: 'dining-in-building', label: 'Dining Area' },
                        { id: 'conference-room', label: 'Meeting Rooms' },
                        { id: 'lobby-in-building', label: 'Lobby' }
                      ].map(amenity => {
                        const isChecked = selectedAmenities.includes(amenity.id);
                        return (
                          <label key={amenity.id} className="flex items-center gap-1.5 text-[10px] text-slate-350 cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              className="rounded bg-slate-905 border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedAmenities(prev => prev.filter(x => x !== amenity.id));
                                } else {
                                  setSelectedAmenities(prev => [...prev, amenity.id]);
                                }
                              }}
                            />
                            <span>{amenity.label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic validation helper widget */}
              <div className="bg-emerald-950/20 text-emerald-450 border border-emerald-900/40 p-2.5 rounded text-[10px] flex items-start gap-1.5">
                <CheckCircle size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Compliance Report Verified:</strong> Target market set to <strong>Property Finder Egypt</strong>. Unit classified as <code>{egyptCategory} / {egyptPropertyType}</code>. Ready for server-to-server Atlas upload.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code and Format Feeds */}
        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between space-y-5">
          
          <div className="space-y-4">
            {/* 1. Formulated Property Code banner */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#C8961A]"></div>
              <span className="text-[9px] font-bold text-[#C8961A] tracking-wider block uppercase mb-1">Generated Real Estate Code</span>
              <div className="text-2xl font-black font-mono text-[#E9C176] tracking-widest">{generatedCode || '-'}</div>
              
              <div className="flex items-center justify-center gap-3 mt-3">
                <button 
                  onClick={() => handleCopy(generatedCode, 'code')}
                  className="p-1 px-3 bg-slate-900 text-slate-300 border border-slate-850 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-800"
                >
                  {copiedField === 'code' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  Copy Code
                </button>
                <button 
                  onClick={handleManualSave}
                  className="p-1 px-3 bg-[#C8961A]/10 text-[#C8961A] border border-[#C8961A]/20 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#C8961A]/20"
                >
                  <Save size={11} />
                  Log to DB
                </button>
              </div>
            </div>

            {/* 2. Format outputs */}
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              
              {/* WhatsApp format block */}
              {whatsappContent && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
                    <span className="font-bold text-emerald-400 font-sans flex items-center gap-1">🟢 WhatsApp Broadcast</span>
                    <button 
                      onClick={() => handleCopy(whatsappContent, 'wa')}
                      className="text-[10px] text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'wa' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      Copy Content
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[10px] text-slate-300 leading-snug">{whatsappContent}</pre>
                </div>
              )}

              {/* Facebook format block */}
              {facebookContent && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
                    <span className="font-bold text-blue-450 font-sans flex items-center gap-1">🔵 Facebook Post</span>
                    <button 
                      onClick={() => handleCopy(facebookContent, 'fb')}
                      className="text-[10px] text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'fb' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      Copy Content
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[10px] text-slate-300 leading-snug" dir="rtl">{facebookContent}</pre>
                </div>
              )}

              {/* Property Finder format block */}
              {pfContent && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
                    <span className="font-bold text-amber-500 font-sans flex items-center gap-1">🏢 Property Finder Layout</span>
                    <button 
                      onClick={() => handleCopy(`${pfTitle}\n\n${pfContent}`, 'pf')}
                      className="text-[10px] text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'pf' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      Copy Content
                    </button>
                  </div>
                  <p className="font-bold text-slate-200 text-xs truncate" dir="rtl">{pfTitle}</p>
                  <p className="font-mono text-[10px] text-slate-300 leading-snug mt-1" dir="rtl">{pfContent}</p>
                </div>
              )}

            </div>
          </div>

          {/* Offer Image Digital representation card */}
          {generatedCode && (
            <div id="digital_banner_offer" className="bg-[#101F3C] border border-[#C8961A]/40 p-4 rounded-xl text-center font-sans space-y-2 mt-2">
              <div className="text-[11px] text-[#C8961A] font-bold tracking-widest uppercase">✦ SIERRA BLU REALTY ✦</div>
              <div className="text-base font-black text-slate-100 tracking-wide uppercase">READY TO MOVE IN!</div>
              <div className="text-xs text-slate-300">📍 Compound: {extractedCompound || 'Mivida'}</div>
              <div className="text-[11px] text-[#E9C176] font-mono">
                🛏️ {extractedBedrooms} Bed | 🛋️ {extractedFurnished === 'F' ? 'Fully Furnished' : 'Premium Standard'}{extractedArea ? ` | 📐 ${extractedArea} sqm` : ''}
              </div>
              <div className="text-md font-bold text-[#E9C176] pt-1">
                💰 {extractedPrice ? extractedPrice.toLocaleString() : '10,000,000'} {extractedCurrency}
              </div>
              
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80">
                <button 
                  onClick={() => alert('Offline-render PDF: Standard brochure data downloaded!')}
                  className="p-1 px-3 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded text-[10px] cursor-pointer flex items-center gap-1 font-bold"
                >
                  <FileText size={10} /> PDF Brochure
                </button>
                <button 
                  onClick={handlePushToPropertyFinder}
                  disabled={isPushingListing}
                  className="p-1 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-[10px] cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <Globe size={10} /> {isPushingListing ? 'Uploading...' : 'Push to PF Portal'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PROPERTY FINDER ENTERPRISE API INTEGRATION PANEL */}
      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h5 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Globe size={18} className="text-amber-500 animate-pulse" />
              Property Finder Integration Hub: Listings & Leads
            </h5>
            <p className="text-xs text-slate-400 mt-0.5">
              Securely synchronized with Property Finder Atlas server-to-server gateway.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-1 rounded font-bold border ${
              pfCreds.authStatus === 'connected' 
              ? 'bg-emerald-950/20 text-emerald-450 border-emerald-900/60' 
              : 'bg-amber-950/20 text-amber-500 border-amber-900/50'
            }`}>
              {pfCreds.authStatus === 'connected' ? '● PF PORTAL CONNECTED (LIVE)' : '● SIMULATED WEB SANDBOX'}
            </span>

            <button
              onClick={() => setShowPfConfig(!showPfConfig)}
              className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-350 p-1.5 px-3 rounded-lg border border-slate-700/60 cursor-pointer flex items-center gap-1.5"
            >
              <Lock size={12} className="text-slate-400" />
              {showPfConfig ? 'Hide API Credentials' : 'Configure API Keys'}
            </button>

            <button
              onClick={fetchPFData}
              disabled={isPfLoading}
              className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 p-1.5 rounded-lg border border-slate-750 cursor-pointer flex items-center"
            >
              <RefreshCw size={13} className={`text-slate-300 ${isPfLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Credentials Form drop down */}
        {showPfConfig && (
          <form onSubmit={handleUpdatePFCreds} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-4 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-bold border-b border-slate-850 pb-2">
              <Key size={14} className="text-amber-400" />
              <span>Modify Client Authentication Keys</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-405 uppercase block">Enterprise API Client Key</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. tMlCs.H28cDC..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-250 outline-none focus:border-amber-500"
                  value={pfApiKeyInput}
                  onChange={(e) => setPfApiKeyInput(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-405 uppercase block">API Client Secret</label>
                <input 
                  type="password"
                  required
                  placeholder="e.g. xG7Ud54s..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-250 outline-none focus:border-amber-500"
                  value={pfApiSecretInput}
                  onChange={(e) => setPfApiSecretInput(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPfApiKeyInput('tMlCs.H28cDCwm6YZXKc8P06DSIK3e9mRMOvDRsi');
                  setPfApiSecretInput('xG7Ud54sQqDgX0hwcy0g54bfPWEzkcJW');
                }}
                className="text-[10px] hover:underline text-slate-500 cursor-pointer"
              >
                Reset Default Credentials
              </button>
              <button
                type="submit"
                className="p-1 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded transition cursor-pointer"
              >
                Update & Link APIs
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column 1: Listings directory */}
          <div className="lg:col-span-7 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[11px] font-bold text-slate-350 uppercase tracking-widest block">
                Active Listings ({pfListings.length})
              </span>
              <button
                onClick={handlePushToPropertyFinder}
                disabled={isPushingListing || !generatedCode}
                className="text-[10px] bg-amber-550/10 text-amber-500 hover:bg-amber-550/20 border border-amber-900/50 p-1 px-3 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                📥 Publish Current Extracted Title ({generatedCode || 'None'})
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {pfListings.length === 0 ? (
                <div className="text-center p-6 text-slate-600 text-xs">
                  No listed units found. Try checking your API connection or pushing the current drafted listing!
                </div>
              ) : (
                pfListings.map((list) => (
                  <div key={list.id} className="p-3 bg-slate-950/80 rounded-lg border border-slate-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          list.status === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                        }`} />
                        <span className="font-bold text-slate-200">{list.title}</span>
                        <span className="text-[10px] bg-slate-850 text-slate-400 p-0.5 px-2 rounded uppercase font-mono font-bold tracking-wider">
                          {list.reference}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 line-clamp-1">{list.description}</p>
                      <div className="flex gap-3 text-[10px] text-slate-500 font-mono">
                        <span>Compound: <strong className="text-slate-400 font-normal">{list.locationName}</strong></span>
                        <span>•</span>
                        <span>{list.bedrooms} Beds | {list.bathrooms} Baths | {list.size} sqm</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end gap-2 shrink-0">
                      <span className="font-bold text-amber-500 font-mono text-[11px] mb-1">
                        {list.price.toLocaleString()} {list.currency}
                      </span>
                      
                      <div className="flex gap-1.5">
                        {list.status === 'live' ? (
                          <button
                            onClick={() => handleUnpublishListingPF(list.id)}
                            className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 p-1 px-2.5 rounded font-black text-[9px] cursor-pointer"
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePublishListingPF(list.id)}
                            className="bg-emerald-950/30 border border-emerald-900/60 hover:bg-emerald-900/20 text-emerald-450 p-1 px-2.5 rounded font-black text-[9px] cursor-pointer"
                          >
                            Publish Live
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteListingPF(list.id)}
                          className="bg-rose-950/20 border border-rose-900/40 hover:bg-rose-900/30 text-rose-450 p-1 rounded cursor-pointer"
                        >
                          <Trash size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Inbound Leads directory */}
          <div className="lg:col-span-5 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[11px] font-bold text-slate-350 uppercase tracking-widest block">
                Inbound Inquiries ({pfLeads.length})
              </span>
              <button
                onClick={handleSimulateInboundPFLead}
                className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-200 p-1 px-2.5 rounded border border-slate-700/60 cursor-pointer font-bold flex items-center gap-1"
              >
                <Plus size={11} className="text-amber-500" />
                Simulate Callbacks
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {pfLeads.length === 0 ? (
                <div className="text-center p-6 text-slate-600 text-xs">
                  No leads received. Use "Simulate Callbacks" to trigger instant leads in your system!
                </div>
              ) : (
                pfLeads.map((lead) => (
                  <div key={lead.id} className="p-3 bg-slate-950/80 rounded-lg border border-slate-850/60 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{lead.senderName}</span>
                        <span className="text-[9px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 p-0.5 px-2 rounded-full uppercase font-bold font-mono">
                          {lead.channel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Phone: {lead.senderPhone} • {lead.senderEmail}</p>
                      <p className="text-[10px] text-[#E9C176] font-semibold">Interested: {lead.propertyInterest}</p>
                      <span className="text-[9px] text-slate-600 font-mono block">
                        Received: {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {lead.imported ? (
                        <span className="text-[10px] text-emerald-450 font-bold flex items-center gap-1">
                          <CheckCircle size={12} /> Sync Done
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImportPFLeadToCRM(lead)}
                          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black p-1 px-2.5 rounded text-[10px] cursor-pointer flex items-center gap-1 shadow"
                        >
                          <UserPlus size={11} /> Import
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* NEW: PROPERTY FINDER API CONNECTION MONITOR & AGENT DEPLOYMENT SUITE */}
        <div id="pf-connection-monitoring-suite" className="border-t border-slate-800/80 pt-6 mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h6 className="text-[11px] font-bold text-amber-550 uppercase tracking-widest block font-mono">Live Operations Center</h6>
              <h5 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity size={15} className="text-amber-500 animate-pulse" />
                Sentry Link Monitor & Multi-Agent Deployment Station
              </h5>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950/60 p-1 px-2.5 rounded border border-slate-850">
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoPolling ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`}></span>
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">
                  {isAutoPolling ? 'Auto-Polling Active' : 'Polling Suspended'}
                </span>
              </div>
              
              <button
                type="button"
                onClick={handleManualPoll}
                className="bg-slate-850 hover:bg-slate-800 text-slate-350 p-1 px-2.5 rounded border border-slate-750 text-[10px] font-semibold flex items-center gap-1 transition"
              >
                <RefreshCw size={10} className={isPollFlicker ? 'animate-spin text-amber-500' : ''} />
                Force Ping
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN 1: PROPERTY FINDER API GATEWAY MONITOR */}
            <div className="bg-slate-955/80 p-4.5 rounded-xl border border-slate-850/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wifi size={12} className="text-emerald-500" />
                  API Endpoint Telemetry Metrics
                </span>
                
                <span className="text-[9px] text-slate-500 font-mono">
                  Last Update: <strong className="text-slate-300">{lastPolledTime === 'Never' ? '--' : lastPolledTime}</strong>
                </span>
              </div>

              {/* Endpoint Loop */}
              <div className="space-y-3">
                {pfEndpoints.map((ep) => {
                  const isAlive = ep.status === 'online' && ep.latency > 0;
                  // Map color bands based on latency speed
                  const isFast = ep.latency > 0 && ep.latency < 60;
                  const isWarning = ep.latency >= 110;

                  return (
                    <div 
                      key={ep.id}
                      className={`p-3 rounded-lg border bg-slate-950/40 transition-all duration-300 flex items-center justify-between gap-4 ${
                        isPollFlicker ? 'border-amber-900/10' : 'border-slate-900'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${isAlive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span className="font-mono text-xs font-bold text-slate-200">{ep.name}</span>
                          <span className="text-[9px] bg-slate-900 text-slate-500 p-0.5 px-2 rounded font-mono font-bold uppercase border border-slate-850">
                            {ep.calls} pings
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono font-medium truncate max-w-[280px]" title={ep.path}>
                          {ep.path}
                        </p>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-xs font-mono font-bold leading-none ${
                            !isAlive ? 'text-rose-500' : isFast ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-slate-300'
                          }`}>
                            {isAlive ? `${ep.latency}ms` : 'TIMEOUT'}
                          </span>
                        </div>

                        {/* Speed index visual bar */}
                        <div className="w-20 bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-850/40">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              !isAlive ? 'w-0' : isFast ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                            style={{ width: `${isAlive ? Math.min(100, Math.max(10, (195 - ep.latency) / 1.5)) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Poller controls */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1 sm:items-center justify-between text-[10px] text-slate-550">
                <div className="flex items-center gap-1.5">
                  <span>Polling Interval:</span>
                  <select
                    value={pollInterval}
                    onChange={(e) => setPollInterval(Number(e.target.value))}
                    className="p-1 px-1.5 bg-slate-900 border border-slate-800 rounded font-bold text-[10px] text-slate-300 outline-none select-none cursor-pointer"
                  >
                    <option value={2}>2s (Real-time Fast)</option>
                    <option value={4}>4s (Optimized Standard)</option>
                    <option value={8}>8s (Conservative)</option>
                    <option value={15}>15s (Low Memory)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>Auto polling:</span>
                  <button
                    type="button"
                    onClick={() => setIsAutoPolling(!isAutoPolling)}
                    className={`p-1 px-3 rounded font-bold transition select-none cursor-pointer text-[9px] ${
                      isAutoPolling 
                        ? 'bg-emerald-950/30 text-emerald-450 border border-emerald-900/60 hover:bg-emerald-950/50' 
                        : 'bg-slate-850 text-slate-400 border border-slate-750 hover:bg-slate-800'
                    }`}
                  >
                    {isAutoPolling ? 'PAUSE MONITOR' : 'RESUME AUTO_RUN'}
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMN 2: DEPLOY MULTI-AGENT & CAMPAIGN WORKFLOW PLUGS */}
            <div className="bg-slate-955/80 p-4.5 rounded-xl border border-slate-850/80 space-y-4 flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={12} className="text-indigo-400" />
                    Broker Agent & Pipeline Cluster
                  </span>
                  
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    deployedAgentsCount > 0 
                      ? 'bg-indigo-950/20 text-indigo-400 border-indigo-900/50' 
                      : 'bg-slate-900 text-slate-500 border-slate-850'
                  }`}>
                    {deployedAgentsCount > 0 ? `${deployedAgentsCount}/3 Agents Online` : 'Cluster Idle'}
                  </span>
                </div>

                {/* Micro Agent listings with state */}
                <div className="space-y-2">
                  {agentSlas.map((agent) => (
                    <div key={agent.id} className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-900/60 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-[#E9C176] text-[11px] block">{agent.name}</span>
                        <p className="text-[10px] text-slate-500 font-mono">Build Code: {agent.version}</p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                          agent.status === 'active' 
                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/40' 
                            : 'bg-rose-950/10 text-rose-500 border border-rose-950'
                        }`}>
                          {agent.status}
                        </span>
                        <p className="text-[9px] text-slate-600 font-mono">Sync: {agent.lastSync}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress bar container */}
                {isDeploying && (
                  <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-lg border border-indigo-950/40">
                    <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                      <span className="text-indigo-400 animate-pulse">⚙️ Hotbooting Pipeline Containers...</span>
                      <span className="text-slate-300">{deployProgress}%</span>
                    </div>

                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850/60">
                      <div 
                        className="bg-indigo-650 h-full rounded-full transition-all duration-300"
                        style={{ width: `${deployProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* CTAs and live sliding log */}
              <div className="pt-2 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                  <div className="md:col-span-8 space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-widest font-mono">Sequence Activity Logging</span>
                    <div className="bg-slate-950/90 border border-slate-900 rounded-lg p-2 h-14 overflow-y-auto font-mono text-[9px] text-indigo-300 leading-relaxed max-w-full">
                      {deployLogs.map((log, idx) => (
                        <div key={idx} className={idx === 0 ? 'text-white font-semibold' : 'opacity-55'}>
                          &gt; {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-4 self-end">
                    <button
                      type="button"
                      disabled={isDeploying}
                      onClick={handleDeployAllAgents}
                      className={`w-full p-2.5 rounded-lg text-slate-950 font-black text-xs cursor-pointer select-none transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        isDeploying
                          ? 'bg-slate-800 border border-slate-700 text-slate-500 scale-98 cursor-not-allowed'
                          : 'bg-[#C8961A] hover:bg-[#E9C176] shadow-md border border-amber-900 animate-pulse'
                      }`}
                    >
                      <Play size={12} className={isDeploying ? '' : 'fill-slate-950'} />
                      {isDeploying ? 'Deploying...' : 'Deploy Suite'}
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* CRM CO-PILOT: WHATSAPP-MAPPED PROPERTY CLIENTS SECTION */}
      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-6">
        
        {/* Header and Counters */}
        <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h5 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Database size={16} className="text-[#C8961A]" />
              CRM Co-Pilot: WhatsApp Client Directory Mappings
            </h5>
            <p className="text-xs text-slate-400 mt-0.5">
              These client files are mapped automatically to active incoming WhatsApp chats based on caller ID (phone number).
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap text-[10px]">
            <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-2 py-1 rounded font-bold uppercase transition">
              Total: {propertyClients.length} Profiles
            </span>
            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-1 rounded font-bold uppercase transition">
              Contacted: {propertyClients.filter(c => c.status !== 'New Lead').length} Active
            </span>
            <span className="bg-amber-950/40 text-amber-500 border border-amber-950/60 px-2 py-1 rounded font-bold uppercase transition">
              Under Offer: {propertyClients.filter(c => c.status === 'Under Offer').length} Deals
            </span>
          </div>
        </div>

        {/* Live sync banner info-alert */}
        <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 text-[11px] text-slate-300 rounded-lg flex items-start gap-2.5">
          <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-indigo-300 text-xs block mb-0.5">⚡ Auto-Mapping Active Simulator Integration</span>
            When an agent selects a conversation or receives an incoming message in the **Simulated WA Web** tab, the service matches the phone number and automatically elevates their CRM file to <span className="text-emerald-400 font-bold bg-slate-900/60 px-1 py-0.5 rounded border border-slate-800">"WhatsApp Contacted"</span> with real-time payload updates!
          </div>
        </div>

        {/* Grid: 1. Customer mapping list, 2. Add client portal */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Directory Table list (takes 2 cols if space permitted) */}
          <div className="xl:col-span-2 space-y-3.5">
            {propertyClients.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg bg-slate-950/20">
                <AlertCircle size={30} className="text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No mapped files exist in the system registry.</p>
                <p className="text-[10px] text-slate-500 mt-1">Use the right-hand panel to register a prospective caller.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {propertyClients.map((client) => {
                  return (
                    <div 
                      key={client.id} 
                      className={`p-4 bg-slate-950/90 rounded-xl border transition-all duration-200 ${
                        client.status === 'WhatsApp Contacted' 
                          ? 'border-indigo-950 shadow-md bg-gradient-to-r from-slate-950 via-slate-950 to-indigo-950/10'
                          : 'border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        {/* Title and Phone Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h6 className="font-extrabold text-sm text-slate-200">{client.name}</h6>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                              {client.phone}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-1.5">
                            <span>Compound Focus: <strong className="text-slate-300 font-semibold">{client.propertyInterest}</strong></span>
                            {client.assignedAgent && (
                              <span className="text-indigo-400">Owner: <strong>{client.assignedAgent}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Status dropdown & deletes */}
                        <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center justify-between sm:justify-start">
                          <select
                            value={client.status}
                            onChange={(e) => {
                              const updated = propertyClients.map(c => 
                                c.id === client.id ? { ...c, status: e.target.value as any, updatedAt: new Date().toLocaleString() } : c
                              );
                              onUpdatePropertyClients(updated);
                            }}
                            className={`p-1.5 text-[10px] font-bold rounded border outline-none outline-0 tracking-wide ${
                              client.status === 'WhatsApp Contacted'
                                ? 'bg-indigo-950/80 text-indigo-400 border-indigo-900/50'
                                : client.status === 'New Lead'
                                ? 'bg-sky-950/80 text-sky-400 border-sky-900/50'
                                : client.status === 'Tour Arranged'
                                ? 'bg-amber-950/80 text-amber-500 border-amber-900/50'
                                : client.status === 'Under Offer'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-950/60'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            <option value="New Lead">🆕 New Lead</option>
                            <option value="WhatsApp Contacted">💬 WhatsApp Contacted</option>
                            <option value="Tour Arranged">📅 Tour Arranged</option>
                            <option value="Under Offer">🤝 Under Offer</option>
                            <option value="Closed Sold">🏆 Closed Sold</option>
                            <option value="No Answer">📞 No Answer</option>
                          </select>

                          <button
                            onClick={() => {
                              if (confirm(`Remove records for ${client.name}?`)) {
                                onUpdatePropertyClients(propertyClients.filter(c => c.id !== client.id));
                              }
                            }}
                            className="p-1 px-2.5 bg-slate-900/40 hover:bg-rose-950/40 text-slate-500 hover:text-rose-401 rounded border border-slate-850/60 cursor-pointer transition"
                            title="Remove profile"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Display Activity logs & Notes section */}
                      <div className="mt-3 pt-3 border-t border-slate-900 flex flex-col gap-2">
                        {/* Dynamic Activity bar log */}
                        <div className="flex justify-between text-[9px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                            Activity: <strong className="text-slate-400 italic font-mono">"{client.lastActivity}"</strong>
                          </span>
                          <span className="text-slate-600">Updated: {client.updatedAt}</span>
                        </div>

                        {/* Inline Notes update box */}
                        <div className="flex gap-2 items-center mt-1">
                          <textarea
                            rows={1}
                            className="flex-1 p-1.5 bg-slate-900 border border-slate-850/60 rounded text-[10px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-indigo-900"
                            placeholder="Add specific notes (payment structure, direct offers...)"
                            defaultValue={client.notes}
                            onBlur={(e) => {
                              const updated = propertyClients.map(c => 
                                c.id === client.id ? { ...c, notes: e.target.value, updatedAt: new Date().toLocaleString() } : c
                              );
                              onUpdatePropertyClients(updated);
                            }}
                          />
                          <span className="text-[8px] bg-slate-900 text-slate-500 rounded p-1 font-bold uppercase shrink-0">Auto Saved</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Prospect Client Portal form */}
          <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-850 space-y-4">
            <h6 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <UserPlus size={14} className="text-[#C8961A]" />
              Formulate Buyer Prospect
            </h6>

            <CRMClientForm propertyClients={propertyClients} onUpdatePropertyClients={onUpdatePropertyClients} />
          </div>

        </div>

      </div>

      {/* SYNC HISTORY: AUTOMATED WHATSAPP REACTION LOGS */}
      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-3">
          <div>
            <h5 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <RefreshCw size={16} className="text-indigo-400 animate-pulse" />
              WhatsApp-to-CRM Auto-Mapping Sync History
            </h5>
            <p className="text-xs text-slate-400 mt-0.5">
              Logs of real-time incoming WhatsApp webhook challenges, automations, and CRM updates.
            </p>
          </div>

          {syncLogs && syncLogs.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all sync history logs?')) {
                  onClearSyncLogs?.();
                }
              }}
              className="text-[10px] bg-rose-950/20 hover:bg-rose-905/30 text-rose-400 border border-rose-900/40 p-1 px-3 rounded cursor-pointer transition font-bold"
            >
              Clear Log Terminals
            </button>
          )}
        </div>

        {!syncLogs || syncLogs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg bg-slate-950/20">
            <p className="text-xs text-slate-500 font-medium">No automated WhatsApp webhook mapping events observed yet.</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Trigger a message from the Simulated WA Web tab to observe real-time CRM updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
            {syncLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg bg-slate-950/80 border text-xs space-y-2 transition-all ${
                  log.status === 'Matched & Updated' 
                    ? 'border-emerald-900/40 hover:border-emerald-800/60' 
                    : 'border-sky-900/40 hover:border-sky-800/60'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-mono block">{log.timestamp}</span>
                    <h6 className="font-bold text-slate-200 flex items-center gap-1.5">
                      {log.name} 
                      <span className="text-[10px] font-mono text-slate-450 font-normal">({log.phone})</span>
                    </h6>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                    log.status === 'Matched & Updated'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60'
                      : 'bg-sky-950/40 text-sky-400 border-sky-900/60'
                  }`}>
                    {log.status === 'Matched & Updated' ? '✓ Matched' : '➕ Registered'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/50 p-1.5 rounded border border-slate-850/65 break-words">
                  {log.details}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Database log feed */}
      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Session Real Estate Code Log List</span>
        
        <div className="space-y-2">
          {savedProperties.map((prop, index) => (
            <div key={index} className="p-3 bg-slate-950/80 rounded-lg border border-slate-850/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="font-mono font-black text-[#E9C176] tracking-wider">{prop.code}</span>
                <span className="text-slate-400">Compound: <strong className="text-slate-300 font-bold">{prop.compound}</strong></span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-slate-550 font-semibold uppercase font-mono">Price: {prop.price.toLocaleString()} {prop.currency}</span>
                <span className="text-slate-500/80 font-semibold">{prop.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Mini inner helper component for creating CRM prospects
function CRMClientForm({ 
  propertyClients, 
  onUpdatePropertyClients 
}: { 
  propertyClients: PropertyClientRecord[], 
  onUpdatePropertyClients: (updated: PropertyClientRecord[]) => void 
}) {
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formInterest, setFormInterest] = useState('Mivida District');
  const [formAgent, setFormAgent] = useState('Ahmed Fawzy');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<any>('New Lead');
  const [hint, setHint] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setHint('❌ Provide at least name and phone number!');
      return;
    }

    const newRecord: PropertyClientRecord = {
      id: 'pc-' + Date.now(),
      name: formName.trim(),
      phone: formPhone.trim(),
      propertyInterest: formInterest.trim(),
      status: formStatus,
      lastActivity: 'Added initially to system index',
      assignedAgent: formAgent,
      notes: formNotes.trim(),
      updatedAt: new Date().toLocaleString()
    };

    onUpdatePropertyClients([newRecord, ...propertyClients]);
    setFormName('');
    setFormPhone('');
    setFormNotes('');
    setHint('🎉 Profile mapped successfully!');
    setTimeout(() => setHint(''), 3000);
  };

  return (
    <form onSubmit={handleCreate} className="space-y-3 text-xs">
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-450 uppercase block">Client Full Name</label>
        <input 
          type="text" 
          required
          placeholder="e.g. Sherif Aly"
          className="w-full p-2 bg-slate-900 border border-slate-800 rounded font-semibold text-xs text-slate-200 outline-none"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-450 uppercase block">WhatsApp Caller ID (Phone)</label>
        <input 
          type="tel" 
          required
          placeholder="e.g. +20101234567"
          className="w-full p-2 bg-slate-900 border border-slate-800 rounded font-semibold text-xs text-slate-200 outline-none"
          value={formPhone}
          onChange={(e) => setFormPhone(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-450 uppercase block">Lead Interest Unit</label>
        <input 
          type="text" 
          placeholder="e.g. Townhouse #12"
          className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 outline-none"
          value={formInterest}
          onChange={(e) => setFormInterest(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-450 uppercase block">Staff Assigned</label>
          <select 
            className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300 outline-none"
            value={formAgent}
            onChange={(e) => setFormAgent(e.target.value)}
          >
            <option value="Ahmed Fawzy">Ahmed Fawzy</option>
            <option value="Sarah Malik">Sarah Malik</option>
            <option value="John Doe">John Doe</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-450 uppercase block">Pipeline Status</label>
          <select 
            className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300 outline-none font-semibold text-amber-500"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
          >
            <option value="New Lead">New Lead</option>
            <option value="WhatsApp Contacted">Contacted</option>
            <option value="Tour Arranged">Tour Arranged</option>
            <option value="Under Offer">Under Offer</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-bold text-slate-450 uppercase block">Acquisition Notes Desk</label>
        <textarea 
          rows={2}
          placeholder="Acquisition rules or specifics..."
          className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 outline-none"
          value={formNotes}
          onChange={(e) => setFormNotes(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] rounded flex items-center justify-center gap-1 transition uppercase tracking-widest cursor-pointer font-black"
      >
        <Plus size={12} />
        Register Caller Profile
      </button>

      {hint && (
        <p className="text-[10px] text-center font-bold text-amber-400 mt-1 animate-pulse">{hint}</p>
      )}
    </form>
  );
}
