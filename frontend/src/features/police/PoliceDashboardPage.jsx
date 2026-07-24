import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../lib/apiClient.js';

const STATUS_LABEL = {
  pending_embedding: 'Processing',
  active: 'Active',
  matched: 'Matched',
  closed: 'Closed',
  cold: 'Cold case',
  unverified: 'Unverified',
  verified: 'Verified',
  false_report: 'Marked false',
};

// Case-status actions available from this dashboard. Uses the existing
// PATCH /missing-persons/:id endpoint (already permits police per
// missingPerson.service.js's assertCanAccess) — no new backend route
// needed for this. Deliberately just status: this dashboard should not
// let police rewrite a family's original report text.
const CASE_STATUS_ACTIONS = [
  { label: 'Mark active', status: 'active' },
  { label: 'Mark closed', status: 'closed' },
  { label: 'Mark cold case', status: 'cold' },
];

export default function PoliceDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sightingsQuery = useQuery({
    queryKey: ['sightings', 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/sightings');
      return res.data.data.sightings;
    },
  });

  const missingPersonsQuery = useQuery({
    queryKey: ['missing-persons', 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/missing-persons');
      return res.data.data.missingPersons;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, action }) => apiClient.post(`/sightings/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sightings', 'all'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/missing-persons/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['missing-persons', 'all'] }),
  });

  const pendingSightings = (sightingsQuery.data || []).filter(
    (s) => s.verificationStatus === 'unverified'
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-trust mb-2">
          Dashboard · police
        </p>
        <h1 className="font-display text-2xl mb-2">
          Welcome{user?.fullName ? `, ${user.fullName}` : ''}.
        </h1>
        <p className="text-sm text-ink-soft mb-8">
          Verify citizen sighting reports and oversee active missing person cases. AI-suggested
          match review will appear here once the matching pipeline is wired up.
        </p>

        {/* Sighting verification queue */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Sightings awaiting verification</h2>
            <span className="text-xs font-mono uppercase tracking-wide text-ink-faint">
              {pendingSightings.length} pending
            </span>
          </div>

          {sightingsQuery.isLoading && <p className="text-sm text-ink-faint">Loading…</p>}
          {sightingsQuery.isError && (
            <p className="text-sm text-red-500">Couldn't load sightings right now.</p>
          )}
          {!sightingsQuery.isLoading && pendingSightings.length === 0 && (
            <p className="text-sm text-ink-faint">Nothing waiting on review right now.</p>
          )}

          <div className="space-y-3">
            {pendingSightings.map((s) => (
              <div
                key={s._id}
                className="rounded-xl border border-line bg-paper px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{s.description}</p>
                  <p className="text-xs text-ink-faint">
                    {s.location?.address || 'Location not specified'}
                    {s.isAnonymous && ' · reported anonymously'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate({ id: s._id, action: 'verify' })}
                    className="text-xs font-medium bg-verified/10 text-verified border border-verified/30 px-3 py-1.5 rounded-full hover:bg-verified/20 transition-colors duration-200 disabled:opacity-50"
                  >
                    Verify
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate({ id: s._id, action: 'mark-false' })}
                    className="text-xs font-medium bg-paper-alt text-ink-soft border border-line px-3 py-1.5 rounded-full hover:border-ink-faint transition-colors duration-200 disabled:opacity-50"
                  >
                    Mark false
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Missing person case oversight */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">All missing person cases</h2>
          </div>

          {missingPersonsQuery.isLoading && <p className="text-sm text-ink-faint">Loading…</p>}
          {missingPersonsQuery.isError && (
            <p className="text-sm text-red-500">Couldn't load cases right now.</p>
          )}
          {!missingPersonsQuery.isLoading && missingPersonsQuery.data?.length === 0 && (
            <p className="text-sm text-ink-faint">No cases reported yet.</p>
          )}

          <div className="space-y-3">
            {missingPersonsQuery.data?.map((mp) => (
              <div
                key={mp._id}
                className="rounded-xl border border-line bg-paper px-4 py-3 flex items-center justify-between gap-4"
              >
                <Link to={`/missing-persons/${mp._id}`} className="min-w-0 group">
                  <p className="text-sm font-medium group-hover:underline">{mp.fullName}</p>
                  <p className="text-xs text-ink-faint">
                    {mp.lastKnownLocation?.address || 'Location not specified'}
                  </p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono uppercase tracking-wide text-trust bg-paper-alt px-2.5 py-1 rounded-full">
                    {STATUS_LABEL[mp.status] || mp.status}
                  </span>
                  <select
                    disabled={statusMutation.isPending}
                    defaultValue=""
                    onChange={(e) => {
                      const status = e.target.value;
                      if (status) statusMutation.mutate({ id: mp._id, status });
                      e.target.value = '';
                    }}
                    className="text-xs border border-line rounded-full px-2 py-1.5 bg-paper text-ink-soft focus:border-trust transition-colors duration-200"
                  >
                    <option value="" disabled>
                      Update status
                    </option>
                    {CASE_STATUS_ACTIONS.map((a) => (
                      <option key={a.status} value={a.status}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
}