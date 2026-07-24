import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const justReported = searchParams.get('reported'); // 'missing-person' | 'sighting'

  // This route is the single place everything in the app points to
  // ("go to your dashboard") — it decides where each role actually
  // belongs, instead of every login/link needing to know that itself.
  // Add one branch here per future role (hospital/ngo/admin) as their
  // dashboards get built; nothing below this needs to change.
  if (user?.role === 'police') {
    return <Navigate to="/police/dashboard" replace />;
  }

  const missingPersonsQuery = useQuery({
    queryKey: ['missing-persons', 'mine'],
    queryFn: async () => {
      const res = await apiClient.get('/missing-persons');
      return res.data.data.missingPersons;
    },
  });

  const sightingsQuery = useQuery({
    queryKey: ['sightings', 'mine'],
    queryFn: async () => {
      const res = await apiClient.get('/sightings');
      return res.data.data.sightings;
    },
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-trust mb-2">
          Dashboard · {user?.role || 'account'}
        </p>
        <h1 className="font-display text-2xl mb-2">
          Welcome{user?.fullName ? `, ${user.fullName}` : ''}.
        </h1>
        <p className="text-sm text-ink-soft mb-8">
          Track the reports you've filed. Feature modules (AI matches, case timeline, messaging,
          etc.) will be added here as each is implemented, per the approved API Specification.
        </p>

        {justReported === 'missing-person' && (
          <div className="mb-8 rounded-xl border border-verified/30 bg-verified/10 px-4 py-3 text-sm text-verified">
            Your missing person report was submitted. It appears below.
          </div>
        )}
        {justReported === 'sighting' && (
          <div className="mb-8 rounded-xl border border-verified/30 bg-verified/10 px-4 py-3 text-sm text-verified">
            Your sighting report was submitted. It appears below.
          </div>
        )}

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Your missing person reports</h2>
            <Link to="/report/missing-person" className="text-sm text-trust hover:underline">
              + New report
            </Link>
          </div>

          {missingPersonsQuery.isLoading && (
            <p className="text-sm text-ink-faint">Loading…</p>
          )}
          {missingPersonsQuery.isError && (
            <p className="text-sm text-red-500">Couldn't load your reports right now.</p>
          )}
          {missingPersonsQuery.data?.length === 0 && (
            <p className="text-sm text-ink-faint">
              You haven't reported anyone missing yet.
            </p>
          )}

          <div className="space-y-3">
            {missingPersonsQuery.data?.map((mp) => (
              <Link
                to={`/missing-persons/${mp._id}`}
                key={mp._id}
                className="rounded-xl border border-line bg-paper px-4 py-3 flex items-center justify-between hover:border-ink-faint transition-colors duration-200"
              >
                <div>
                  <p className="text-sm font-medium">{mp.fullName}</p>
                  <p className="text-xs text-ink-faint">
                    {mp.lastKnownLocation?.address || 'Location not specified'}
                  </p>
                </div>
                <span className="text-xs font-mono uppercase tracking-wide text-trust bg-paper-alt px-2.5 py-1 rounded-full">
                  {STATUS_LABEL[mp.status] || mp.status}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Your sighting reports</h2>
            <Link to="/report/sighting" className="text-sm text-trust hover:underline">
              + New sighting
            </Link>
          </div>

          {sightingsQuery.isLoading && <p className="text-sm text-ink-faint">Loading…</p>}
          {sightingsQuery.isError && (
            <p className="text-sm text-red-500">Couldn't load your sightings right now.</p>
          )}
          {sightingsQuery.data?.length === 0 && (
            <p className="text-sm text-ink-faint">You haven't reported any sightings yet.</p>
          )}

          <div className="space-y-3">
            {sightingsQuery.data?.map((s) => (
              <div
                key={s._id}
                className="rounded-xl border border-line bg-paper px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium line-clamp-1">{s.description}</p>
                  <p className="text-xs text-ink-faint">
                    {s.location?.address || 'Location not specified'}
                  </p>
                </div>
                <span className="text-xs font-mono uppercase tracking-wide text-trust bg-paper-alt px-2.5 py-1 rounded-full">
                  {STATUS_LABEL[s.verificationStatus] || s.verificationStatus}
                </span>
              </div>
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
}