import { useState } from 'react';
import { BellRing, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useScamSentry } from '../context/ScamSentryContext';
import { RiskLabel } from '../components/RiskBadge';

export function FamilyProtectionView() {
  const {
    settings,
    updateSettings,
    familyContacts,
    addFamilyContact,
    removeFamilyContact,
    toggleFamilyContactNotify,
    familyAlerts,
    triggerFamilyAlert,
  } = useScamSentry();

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [channel, setChannel] = useState('In-App Family Alert Channel (Simulated)');

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !relationship.trim()) return;
    addFamilyContact({
      name: name.trim(),
      relationship: relationship.trim(),
      contactChannel: channel.trim(),
    });
    setName('');
    setRelationship('');
  };

  const handleSimulateAlert = () => {
    triggerFamilyAlert({
      scamCategory: 'Banking Fraud',
      riskLevel: 'Critical',
      message:
        'ScamSentry AI detected a potential banking scam during a monitored conversation. Please check with your family member.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Master Toggle */}
      <div className="sentry-panel rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
            <Users className="w-4 h-4" aria-hidden="true" />
            <span>Family Protection Mode · In-App Notification Simulation</span>
          </div>
          <h1 className="text-xl font-display font-semibold text-white">
            Trusted Family Safety Circle
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Help protect vulnerable relatives from high-risk social engineering calls. When enabled and consented, ScamSentry AI dispatches an in-app simulated family alert—no external SMS, WhatsApp, or email messages are transmitted without an authorized messaging service.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={settings.familyProtectionEnabled}
            onClick={() =>
              updateSettings({ familyProtectionEnabled: !settings.familyProtectionEnabled })
            }
            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              settings.familyProtectionEnabled
                ? 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            Family Protection: {settings.familyProtectionEnabled ? 'Enabled' : 'Disabled'}
          </button>

          <button
            type="button"
            disabled={!settings.familyProtectionEnabled || !settings.consentToMonitor}
            onClick={handleSimulateAlert}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
            Simulate High-Risk Family Alert
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 6 Cols: Trusted Contacts + Add Contact */}
        <div className="xl:col-span-6 space-y-4">
          <form onSubmit={handleAddContact} className="sentry-panel rounded-xl p-5 space-y-3">
            <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-300" aria-hidden="true" />
              Add Trusted Family Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="fc-name" className="block text-xs text-slate-300 mb-1">
                  Contact Name
                </label>
                <input
                  id="fc-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Chen"
                  className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-sm text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="fc-rel" className="block text-xs text-slate-300 mb-1">
                  Relationship / Role
                </label>
                <input
                  id="fc-rel"
                  type="text"
                  required
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Parent / Trusted Guardian"
                  className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-sm text-slate-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="fc-channel" className="block text-xs text-slate-300 mb-1">
                Alert Channel (Simulated)
              </label>
              <input
                id="fc-channel"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-200"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
              >
                Add Contact
              </button>
            </div>
          </form>

          <div className="sentry-panel rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-display font-semibold text-white">
              Trusted Contacts ({familyContacts.length})
            </h3>
            {familyContacts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No trusted contacts added yet. Add a family member above.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {familyContacts.map((fc) => (
                  <div key={fc.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">{fc.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {fc.relationship} · {fc.contactChannel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFamilyContactNotify(fc.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border ${
                          fc.notifyOnHighRisk
                            ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {fc.notifyOnHighRisk ? 'Alerts On' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFamilyContact(fc.id)}
                        aria-label={`Remove ${fc.name}`}
                        className="p-1.5 rounded text-slate-400 hover:text-red-300 hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 6 Cols: Family Alert Activity Log & Safety Tips */}
        <div className="xl:col-span-6 space-y-4">
          <div className="sentry-panel rounded-xl p-5 space-y-3">
            <h2 className="text-base font-display font-semibold text-white">
              Family Protection Activity Log
            </h2>
            {familyAlerts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No family alerts triggered yet. High-risk detections or simulations will appear here.
              </p>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto">
                {familyAlerts.map((al) => (
                  <div
                    key={al.id}
                    className="rounded-lg bg-[#080E1B] border border-slate-800 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        To: {al.contactName}
                      </span>
                      <RiskLabel level={al.riskLevel} />
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{al.message}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {al.deliveryMode} · {al.scamCategory} ·{' '}
                      {new Date(al.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sentry-panel rounded-xl p-5 space-y-2.5">
            <h3 className="text-sm font-display font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              Family Safety Recommendations
            </h3>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <li>Establish a family code word or callback rule before sending emergency funds.</li>
              <li>Remind family members that banks and police never ask for OTPs or remote screen access.</li>
              <li>Encourage pausing high-pressure calls and transferring suspicious callers to AI Decoy.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
