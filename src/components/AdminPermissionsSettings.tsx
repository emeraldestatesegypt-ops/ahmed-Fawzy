import React, { useState } from 'react';
import { Shield, ShieldCheck, Lock, Unlock, Check, AlertCircle, RefreshCw, Layers, Users, Eye, Edit, Ban } from 'lucide-react';

interface SectionPermission {
  sectionId: string;
  sectionName: string;
  description: string;
  access: 'No Access' | 'Viewer' | 'Manager';
}

interface RolePermissions {
  id: string;
  name: string;
  description: string;
  tag: string;
  permissions: SectionPermission[];
}

const INITIAL_ROLES: RolePermissions[] = [
  {
    id: 'role-super-admin',
    name: 'Super Administrator',
    tag: 'SUPER_ADMIN',
    description: 'Unrestricted access to adjust system keys, manage servers, compile listings, and override routing rule lists.',
    permissions: [
      { sectionId: 'reports', sectionName: 'Agent Productivity Tab', description: 'Performance analytics, speed index graphs, and telemetry lists.', access: 'Manager' },
      { sectionId: 'campaigns', sectionName: 'Bulk Message Sender', description: 'Launch outreach campaigns, load lists, and manage anti-ban controls.', access: 'Manager' },
      { sectionId: 'hierarchy', sectionName: 'Workflow & Hierarchy Page', description: 'Modify pipeline routing, map teams, and assign workloads.', access: 'Manager' },
      { sectionId: 'livechat', sectionName: 'Simulated WA Sandbox', description: 'Inbound message webhook simulator and live chat controls.', access: 'Manager' },
      { sectionId: 'propertymanager', sectionName: 'Property Code Terminal', description: 'Synthesize listings, fine-tune Egypt regional meta-mappings.', access: 'Manager' },
      { sectionId: 'settings', sectionName: 'Meta API Settings', description: 'Manage developer access keys, security challanges, and certificates.', access: 'Manager' }
    ]
  },
  {
    id: 'role-regional-manager',
    name: 'Regional Sales Manager',
    tag: 'MANAGER',
    description: 'Middle management level. Allowed to monitor agent performance, launch campaigns, and adjust property mappings, but restricted from altering security API keys.',
    permissions: [
      { sectionId: 'reports', sectionName: 'Agent Productivity Tab', description: 'Performance analytics, speed index graphs, and telemetry lists.', access: 'Manager' },
      { sectionId: 'campaigns', sectionName: 'Bulk Message Sender', description: 'Launch outreach campaigns, load lists, and manage anti-ban controls.', access: 'Manager' },
      { sectionId: 'hierarchy', sectionName: 'Workflow & Hierarchy Page', description: 'Modify pipeline routing, map teams, and assign workloads.', access: 'Manager' },
      { sectionId: 'livechat', sectionName: 'Simulated WA Sandbox', description: 'Inbound message webhook simulator and live chat controls.', access: 'Manager' },
      { sectionId: 'propertymanager', sectionName: 'Property Code Terminal', description: 'Synthesize listings, fine-tune Egypt regional meta-mappings.', access: 'Manager' },
      { sectionId: 'settings', sectionName: 'Meta API Settings', description: 'Manage developer access keys, security challanges, and certificates.', access: 'Viewer' }
    ]
  },
  {
    id: 'role-agent-viewer',
    name: 'Sales Support Specialist',
    tag: 'SUPPORT_VIEWER',
    description: 'Client assistance staff. Granted read-only monitoring privileges across analytics and live simulators to coordinate tours, but forbidden from editing campaigns or pipelines.',
    permissions: [
      { sectionId: 'reports', sectionName: 'Agent Productivity Tab', description: 'Performance analytics, speed index graphs, and telemetry lists.', access: 'Viewer' },
      { sectionId: 'campaigns', sectionName: 'Bulk Message Sender', description: 'Launch outreach campaigns, load lists, and manage anti-ban controls.', access: 'No Access' },
      { sectionId: 'hierarchy', sectionName: 'Workflow & Hierarchy Page', description: 'Modify pipeline routing, map teams, and assign workloads.', access: 'Viewer' },
      { sectionId: 'livechat', sectionName: 'Simulated WA Sandbox', description: 'Inbound message webhook simulator and live chat controls.', access: 'Manager' },
      { sectionId: 'propertymanager', sectionName: 'Property Code Terminal', description: 'Synthesize listings, fine-tune Egypt regional meta-mappings.', access: 'Viewer' },
      { sectionId: 'settings', sectionName: 'Meta API Settings', description: 'Manage developer access keys, security challanges, and certificates.', access: 'No Access' }
    ]
  }
];

export default function AdminPermissionsSettings() {
  const [roles, setRoles] = useState<RolePermissions[]>(() => {
    const saved = localStorage.getItem('wasender_admin_roles');
    return saved ? JSON.parse(saved) : INITIAL_ROLES;
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-super-admin');
  const [activeTestRole, setActiveTestRole] = useState<string>(() => {
    return localStorage.getItem('wasender_active_test_role') || 'role-super-admin';
  });

  const [savingStatus, setSavingStatus] = useState<string>('');
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const handleUpdatePermission = (sectionId: string, level: 'No Access' | 'Viewer' | 'Manager') => {
    const updated = roles.map(role => {
      if (role.id === selectedRoleId) {
        return {
          ...role,
          permissions: role.permissions.map(perm => {
            if (perm.sectionId === sectionId) {
              return { ...perm, access: level };
            }
            return perm;
          })
        };
      }
      return role;
    });

    setRoles(updated);
    localStorage.setItem('wasender_admin_roles', JSON.stringify(updated));
    showToast('Permission state updated locally');
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const newRole: RolePermissions = {
      id: 'role-' + Date.now(),
      name: newRoleName,
      tag: newRoleName.replace(/\s+/g, '_').toUpperCase(),
      description: newRoleDesc || 'Custom declared sales organization role credentials.',
      permissions: [
        { sectionId: 'reports', sectionName: 'Agent Productivity Tab', description: 'Performance analytics, speed index graphs, and telemetry lists.', access: 'Viewer' },
        { sectionId: 'campaigns', sectionName: 'Bulk Message Sender', description: 'Launch outreach campaigns, load lists, and manage anti-ban controls.', access: 'No Access' },
        { sectionId: 'hierarchy', sectionName: 'Workflow & Hierarchy Page', description: 'Modify pipeline routing, map teams, and assign workloads.', access: 'No Access' },
        { sectionId: 'livechat', sectionName: 'Simulated WA Sandbox', description: 'Inbound message webhook simulator and live chat controls.', access: 'Viewer' },
        { sectionId: 'propertymanager', sectionName: 'Property Code Terminal', description: 'Synthesize listings, fine-tune Egypt regional meta-mappings.', access: 'Viewer' },
        { sectionId: 'settings', sectionName: 'Meta API Settings', description: 'Manage developer access keys, security challanges, and certificates.', access: 'No Access' }
      ]
    };

    const nextRoles = [...roles, newRole];
    setRoles(nextRoles);
    localStorage.setItem('wasender_admin_roles', JSON.stringify(nextRoles));
    setSelectedRoleId(newRole.id);

    setNewRoleName('');
    setNewRoleDesc('');
    setIsAddingRole(false);
    showToast(`Successfully registered new role: ${newRole.name}`);
  };

  const handleDeleteRole = (id: string) => {
    if (id === 'role-super-admin' || id === 'role-regional-manager' || id === 'role-agent-viewer') {
      alert('🔒 Out-of-the-box template roles cannot be removed to enforce system fallback safety.');
      return;
    }

    if (confirm('Are you sure you want to delete this custom permission role?')) {
      const nextRoles = roles.filter(r => r.id !== id);
      setRoles(nextRoles);
      localStorage.setItem('wasender_admin_roles', JSON.stringify(nextRoles));
      setSelectedRoleId('role-super-admin');
      showToast('Custom permission role removed');
    }
  };

  const handleApplySimulation = () => {
    localStorage.setItem('wasender_active_test_role', activeTestRole);
    showToast('Applied test simulation bounds! Restricted features will now conform to this role.');
    // Trigger window storage event to notify main app
    window.dispatchEvent(new Event('storage'));
    
    // Quick full page status update feedback simulation
    setSavingStatus('Applying role bounds...');
    setTimeout(() => {
      setSavingStatus('Success! Refreshing sandbox restrictions...');
      setTimeout(() => {
        setSavingStatus('');
        // Trigger a force reload or state rewrite to apply locks
        window.location.reload();
      }, 700);
    }, 450);
  };

  const showToast = (msg: string) => {
    setSavingStatus(msg);
    setTimeout(() => setSavingStatus(''), 2500);
  };

  return (
    <div id="admin-permissions-sec" className="space-y-6 pt-4 border-t border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Shield size={16} className="text-[#C8961A]" />
            Enterprise Admin Permissions Suite
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Delegate platform access permissions across security endpoints, campaign schedulers, and analytics.
          </p>
        </div>

        {savingStatus && (
          <span className="text-[10px] bg-indigo-950/80 text-indigo-400 border border-indigo-900/60 p-1 px-3 rounded-md font-mono font-bold animate-pulse">
            ⚙️ {savingStatus}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Roles list selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Defined System Roles</span>
            {!isAddingRole && (
              <button
                onClick={() => setIsAddingRole(true)}
                className="text-[9px] text-[#C8961A] hover:underline uppercase font-bold flex items-center gap-1 cursor-pointer"
              >
                + New Role
              </button>
            )}
          </div>

          {isAddingRole ? (
            <form onSubmit={handleCreateRole} className="p-3 bg-slate-950/80 rounded-lg border border-slate-850 space-y-3">
              <span className="text-[10px] text-[#C8961A] font-bold uppercase block">Create Access Credential</span>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase font-semibold block">Role Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Egypt Regional Auditor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none focus:border-amber-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase font-semibold block">Description</label>
                <textarea 
                  placeholder="Granted rights to observe..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 h-16 outline-none focus:border-amber-900 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRole(false)}
                  className="flex-1 py-1 text-[10px] font-bold text-slate-400 bg-slate-900 rounded border border-slate-800 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1 text-[10px] font-bold text-slate-900 bg-[#C8961A] rounded hover:bg-[#E9C176] transition cursor-pointer"
                >
                  Save Access
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-[#C8961A]/50 text-slate-100 shadow-md'
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        isSelected 
                          ? 'bg-[#C8961A]/10 text-[#C8961A] border border-[#C8961A]/20' 
                          : 'bg-slate-950 text-slate-500'
                      }`}>
                        {role.tag}
                      </span>
                      {role.id !== 'role-super-admin' && role.id !== 'role-regional-manager' && role.id !== 'role-agent-viewer' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role.id);
                          }}
                          className="text-slate-600 hover:text-rose-400 opacity-60 hover:opacity-100 transition"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    <h5 className="font-bold text-xs text-slate-200 mt-1.5">{role.name}</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-1 line-clamp-2">
                      {role.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* SIMULATION TEST HARNESS SUITE */}
          <div className="p-3 bg-indigo-950/10 rounded-lg border border-indigo-900/20 space-y-2 text-xs">
            <span className="text-[9px] font-bold uppercase text-indigo-400 flex items-center gap-1.5">
              <RefreshCw size={10} className="animate-spin" /> Live Simulation Sandbox Controls
            </span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Select which role to simulate currently to restriction test. Useful to demonstrate Viewer vs. Manager mode live!
            </p>
            <div className="flex gap-2">
              <select
                className="flex-1 p-1 px-2 text-[11px] bg-slate-950 border border-slate-850 rounded text-slate-300 font-medium cursor-pointer"
                value={activeTestRole}
                onChange={(e) => setActiveTestRole(e.target.value)}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplySimulation}
                className="bg-indigo-650 hover:bg-indigo-600 border border-indigo-705 p-1 px-2.5 rounded font-bold text-[10px] text-white transition cursor-pointer shrink-0"
              >
                Apply Bounds
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Permission Matrix/Mapping */}
        <div className="lg:col-span-8 bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <div>
              <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest block font-sans">Permission Configuration for:</span>
              <h4 className="text-sm font-bold text-[#E9C176]">{selectedRole.name}</h4>
            </div>
            
            <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 p-0.5 px-2 rounded font-mono uppercase font-semibold">
              {selectedRole.permissions.length} targets configured
            </span>
          </div>

          <div className="space-y-3">
            {selectedRole.permissions.map((perm) => {
              return (
                <div 
                  key={perm.sectionId} 
                  className="bg-slate-950 border border-slate-850 hover:border-slate-800 p-3.5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs transition"
                >
                  <div className="space-y-1 flex-1">
                    <span className="font-bold text-slate-200 block">{perm.sectionName}</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{perm.description}</p>
                  </div>

                  {/* Level Controls */}
                  <div className="flex items-center gap-1 bg-slate-925 p-0.5 rounded border border-slate-850 text-[10px] font-bold">
                    {[
                      { level: 'No Access' as const, label: 'Access Barred', color: 'bg-rose-950/20 text-rose-500 hover:text-rose-450 border-rose-950', icon: Ban },
                      { level: 'Viewer' as const, label: 'Viewer Mode', color: 'bg-indigo-950/20 text-indigo-400 hover:text-indigo-350 border-indigo-950', icon: Eye },
                      { level: 'Manager' as const, label: 'Full Manager', color: 'bg-emerald-950/20 text-emerald-400 hover:text-emerald-350 border-emerald-950', icon: Edit }
                    ].map((btn) => {
                      const isSelected = perm.access === btn.level;
                      const IconComponent = btn.icon;
                      
                      return (
                        <button
                          key={btn.level}
                          type="button"
                          onClick={() => handleUpdatePermission(perm.sectionId, btn.level)}
                          className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded transition cursor-pointer select-none ${
                            isSelected
                              ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-400'
                          }`}
                          title={`Assign "${btn.level}" limits to ${perm.sectionName}`}
                        >
                          <IconComponent size={11} className={isSelected ? 'text-[#C8961A]' : 'opacity-40'} />
                          <span>{btn.level}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-950/10 p-3 rounded-lg border border-amber-900/30 flex items-start gap-2.5 text-[10px] leading-relaxed text-[#E9C176]">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <strong>Production Integration Guard:</strong> Permission scopes declared here automatically lock features at module-mount boundaries. Custom additions are saved straight to persistent <code>localStorage</code> to safeguard sessions.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
