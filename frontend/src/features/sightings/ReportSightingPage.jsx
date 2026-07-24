import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { sightingSchema } from './sighting.schemas.js';
import apiClient from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import LocationPicker from '../../components/map/LocationPicker.jsx';

const inputClass =
  'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm focus:border-trust transition-colors duration-200';
const labelClass = 'block text-sm text-ink-soft mb-1.5';

export default function ReportSightingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(sightingSchema),
    defaultValues: { isAnonymous: false },
  });

  const latitude = watch('latitude');
  const longitude = watch('longitude');

  const handleLocationChange = ({ lat, lng, address }) => {
    setValue('latitude', lat, { shouldValidate: true });
    setValue('longitude', lng, { shouldValidate: true });
    if (address) setValue('locationAddress', address, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      const payload = {
        description: data.description,
        locationAddress: data.locationAddress || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        sightedAt: data.sightedAt || undefined,
        photos: data.photoUrl ? [data.photoUrl] : [],
        isAnonymous: isAuthenticated ? data.isAnonymous : true,
      };

      await apiClient.post('/sightings', payload);

      if (isAuthenticated) {
        navigate('/dashboard?reported=sighting');
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        'Something went wrong submitting this report. Please try again.';
      setServerError(message);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm text-center"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-trust mb-2">Thank you</p>
          <h1 className="font-display text-2xl mb-3">Sighting reported.</h1>
          <p className="text-sm text-ink-soft">
            Your report has been sent to police for review. Since you weren't signed in, it was
            submitted anonymously.
          </p>
          <Link to="/" className="inline-block mt-6 text-sm text-trust hover:underline">
            Back to home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-trust mb-2">Report</p>
        <h1 className="font-display text-2xl mb-2">Report a sighting.</h1>
        <p className="text-sm text-ink-soft mb-8">
          {isAuthenticated
            ? 'Every detail helps, even if you\'re not certain. You can choose to stay anonymous.'
            : 'Every detail helps, even if you\'re not certain. You\'re not signed in, so this will be submitted anonymously.'}
        </p>

        {serverError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="description" className={labelClass}>What did you see?</label>
            <textarea
              id="description"
              {...register('description')}
              rows={4}
              className={inputClass}
              placeholder="Describe the person, what they were wearing, and the situation..."
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="locationAddress" className={labelClass}>Location</label>
              <input id="locationAddress" {...register('locationAddress')} className={inputClass} placeholder="Area, city" />
            </div>
            <div>
              <label htmlFor="sightedAt" className={labelClass}>When</label>
              <input id="sightedAt" type="datetime-local" {...register('sightedAt')} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Pin the exact spot on the map</label>
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleLocationChange}
            />
            <input type="hidden" {...register('latitude', { valueAsNumber: true })} />
            <input type="hidden" {...register('longitude', { valueAsNumber: true })} />
          </div>

          <div>
            <label htmlFor="photoUrl" className={labelClass}>Photo URL (optional)</label>
            <input id="photoUrl" {...register('photoUrl')} className={inputClass} placeholder="https://..." />
            {errors.photoUrl && <p className="text-xs text-red-500 mt-1">{errors.photoUrl.message}</p>}
          </div>

          {isAuthenticated && (
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" {...register('isAnonymous')} className="rounded border-line" />
              Report anonymously
            </label>
          )}

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-trust text-paper py-2.5 rounded-full shadow-soft hover:bg-trust-deep transition-colors duration-200 disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Submit sighting'}
          </motion.button>
        </form>

        <p className="text-sm text-ink-faint mt-6">
          Reporting someone missing instead?{' '}
          <Link to="/report/missing-person" className="text-trust hover:underline">Report a missing person</Link>
        </p>
      </motion.div>
    </div>
  );
}