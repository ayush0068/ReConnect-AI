import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { missingPersonSchema } from './missingPerson.schemas.js';
import apiClient from '../../lib/apiClient.js';
import LocationPicker from '../../components/map/LocationPicker.jsx';
import LocationDisplayMap from '../../components/map/LocationDisplayMap.jsx';
import { missingPersonIcon } from '../../lib/mapIcons.js';

const inputClass =
  'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm focus:border-trust transition-colors duration-200';
const labelClass = 'block text-sm text-ink-soft mb-1.5';

const STATUS_LABEL = {
  pending_embedding: 'Processing',
  active: 'Active',
  matched: 'Matched',
  closed: 'Closed',
  cold: 'Cold case',
};

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 10);
}

export default function MissingPersonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: mp, isLoading, isError } = useQuery({
    queryKey: ['missing-persons', id],
    queryFn: async () => {
      const res = await apiClient.get(`/missing-persons/${id}`);
      return res.data.data.missingPerson;
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(missingPersonSchema),
    values: mp
      ? {
          fullName: mp.fullName || '',
          age: mp.age != null ? String(mp.age) : '',
          gender: mp.gender || 'unknown',
          height: mp.height != null ? String(mp.height) : '',
          clothingDescription: mp.clothingDescription || '',
          descriptionText: mp.descriptionText || '',
          identifyingMarksText: (mp.identifyingMarks || []).join(', '),
          lastKnownAddress: mp.lastKnownLocation?.address || '',
          latitude: mp.lastKnownLocation?.coordinates?.[1],
          longitude: mp.lastKnownLocation?.coordinates?.[0],
          lastSeenAt: toDateInputValue(mp.lastSeenAt),
          photoUrl: mp.photos?.[0] || '',
        }
      : undefined,
  });

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const handleLocationChange = ({ lat, lng, address }) => {
    setValue('latitude', lat, { shouldValidate: true });
    setValue('longitude', lng, { shouldValidate: true });
    if (address) setValue('lastKnownAddress', address, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      const payload = {
        fullName: data.fullName,
        age: data.age,
        gender: data.gender,
        height: data.height,
        clothingDescription: data.clothingDescription,
        descriptionText: data.descriptionText,
        lastKnownAddress: data.lastKnownAddress || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        lastSeenAt: data.lastSeenAt || undefined,
        identifyingMarks: data.identifyingMarksText
          ? data.identifyingMarksText.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        photos: data.photoUrl ? [data.photoUrl] : [],
      };

      await apiClient.patch(`/missing-persons/${id}`, payload);
      await queryClient.invalidateQueries({ queryKey: ['missing-persons'] });
      setIsEditing(false);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        'Something went wrong saving your changes. Please try again.';
      setServerError(message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this report? This can\'t be undone.')) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/missing-persons/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['missing-persons'] });
      navigate('/dashboard');
    } catch {
      setIsDeleting(false);
      setServerError('Could not delete this report. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="min-h-[calc(100vh-4rem)] px-6 py-16 text-sm text-ink-faint">Loading…</div>;
  }

  if (isError || !mp) {
    return (
      <div className="min-h-[calc(100vh-4rem)] px-6 py-16">
        <p className="text-sm text-red-500">
          Couldn't load this report. It may not exist, or you may not have access to it.
        </p>
        <Link to="/dashboard" className="text-sm text-trust hover:underline mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl mx-auto"
      >
        <Link to="/dashboard" className="text-sm text-ink-faint hover:text-ink-soft">← Back to dashboard</Link>

        <div className="flex items-center justify-between mt-4 mb-2">
          <p className="font-mono text-xs uppercase tracking-widest text-trust">
            {STATUS_LABEL[mp.status] || mp.status}
          </p>
          {!isEditing && (
            <div className="flex gap-4">
              <button onClick={() => setIsEditing(true)} className="text-sm text-trust hover:underline">
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-sm text-red-500 hover:underline disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>

        {serverError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="fullName" className={labelClass}>Full name</label>
              <input id="fullName" {...register('fullName')} className={inputClass} />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="age" className={labelClass}>Age</label>
                <input id="age" type="number" {...register('age')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="gender" className={labelClass}>Gender</label>
                <select id="gender" {...register('gender')} className={inputClass}>
                  <option value="unknown">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="height" className={labelClass}>Height (cm)</label>
                <input id="height" type="number" {...register('height')} className={inputClass} />
              </div>
            </div>

            <div>
              <label htmlFor="descriptionText" className={labelClass}>Description</label>
              <textarea id="descriptionText" {...register('descriptionText')} rows={4} className={inputClass} />
              {errors.descriptionText && <p className="text-xs text-red-500 mt-1">{errors.descriptionText.message}</p>}
            </div>

            <div>
              <label htmlFor="clothingDescription" className={labelClass}>Clothing when last seen</label>
              <input id="clothingDescription" {...register('clothingDescription')} className={inputClass} />
            </div>

            <div>
              <label htmlFor="identifyingMarksText" className={labelClass}>Identifying marks (comma separated)</label>
              <input id="identifyingMarksText" {...register('identifyingMarksText')} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="lastKnownAddress" className={labelClass}>Last known location</label>
                <input id="lastKnownAddress" {...register('lastKnownAddress')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="lastSeenAt" className={labelClass}>Last seen on</label>
                <input id="lastSeenAt" type="date" {...register('lastSeenAt')} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Pin the last known location on the map</label>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onLocationChange={handleLocationChange}
              />
              <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
              <input type="hidden" {...register('longitude', { valueAsNumber: true })} />
            </div>

            <div>
              <label htmlFor="photoUrl" className={labelClass}>Photo URL</label>
              <input id="photoUrl" {...register('photoUrl')} className={inputClass} />
              {errors.photoUrl && <p className="text-xs text-red-500 mt-1">{errors.photoUrl.message}</p>}
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-trust text-paper py-2.5 rounded-full shadow-soft hover:bg-trust-deep transition-colors duration-200 disabled:opacity-60"
              >
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </motion.button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 rounded-full border border-line text-sm hover:bg-paper-alt transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <h1 className="font-display text-2xl">{mp.fullName}</h1>

            {mp.photos?.[0] && (
              <img
                src={mp.photos[0]}
                alt={mp.fullName}
                className="w-full max-h-80 object-cover rounded-xl border border-line"
              />
            )}

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-faint">Age</dt>
                <dd>{mp.age ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Gender</dt>
                <dd className="capitalize">{mp.gender}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Height</dt>
                <dd>{mp.height ? `${mp.height} cm` : '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Last seen</dt>
                <dd>{mp.lastSeenAt ? new Date(mp.lastSeenAt).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>

            <div>
              <p className="text-ink-faint text-sm mb-1">Description</p>
              <p className="text-sm leading-relaxed">{mp.descriptionText}</p>
            </div>

            {mp.clothingDescription && (
              <div>
                <p className="text-ink-faint text-sm mb-1">Clothing when last seen</p>
                <p className="text-sm leading-relaxed">{mp.clothingDescription}</p>
              </div>
            )}

            {mp.identifyingMarks?.length > 0 && (
              <div>
                <p className="text-ink-faint text-sm mb-1">Identifying marks</p>
                <div className="flex flex-wrap gap-2">
                  {mp.identifyingMarks.map((mark) => (
                    <span key={mark} className="text-xs bg-paper-alt border border-line rounded-full px-3 py-1">
                      {mark}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-ink-faint text-sm mb-1">Last known location</p>
              <p className="text-sm leading-relaxed mb-2">{mp.lastKnownLocation?.address || '—'}</p>
              <LocationDisplayMap
                latitude={mp.lastKnownLocation?.coordinates?.[1]}
                longitude={mp.lastKnownLocation?.coordinates?.[0]}
                label={mp.lastKnownLocation?.address}
                icon={missingPersonIcon}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}