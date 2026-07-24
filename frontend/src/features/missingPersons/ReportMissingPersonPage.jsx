import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { missingPersonSchema } from './missingPerson.schemas.js';
import apiClient from '../../lib/apiClient.js';
import LocationPicker from '../../components/map/LocationPicker.jsx';

const inputClass =
  'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm focus:border-trust transition-colors duration-200';
const labelClass = 'block text-sm text-ink-soft mb-1.5';

export default function ReportMissingPersonPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(missingPersonSchema),
    defaultValues: { gender: 'unknown' },
  });

  const latitude = watch('latitude', undefined);
  const longitude = watch('longitude', undefined);

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

      await apiClient.post('/missing-persons', payload);
      navigate('/dashboard?reported=missing-person');
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        'Something went wrong submitting this report. Please try again.';
      setServerError(message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-trust mb-2">Report</p>
        <h1 className="font-display text-2xl mb-2">Report a missing person.</h1>
        <p className="text-sm text-ink-soft mb-8">
          Share everything you can — even a rough description helps. You can add more detail,
          including photos, any time from your dashboard.
        </p>

        {serverError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="fullName" className={labelClass}>Full name</label>
            <input id="fullName" {...register('fullName')} className={inputClass} placeholder="Who is missing?" />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="age" className={labelClass}>Age</label>
              <input id="age" type="number" {...register('age')} className={inputClass} placeholder="e.g. 34" />
              {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age.message}</p>}
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
              <input id="height" type="number" {...register('height')} className={inputClass} placeholder="e.g. 170" />
            </div>
          </div>

          <div>
            <label htmlFor="descriptionText" className={labelClass}>Description</label>
            <textarea
              id="descriptionText"
              {...register('descriptionText')}
              rows={4}
              className={inputClass}
              placeholder="Physical description, what they were doing, anything distinctive..."
            />
            {errors.descriptionText && <p className="text-xs text-red-500 mt-1">{errors.descriptionText.message}</p>}
          </div>

          <div>
            <label htmlFor="clothingDescription" className={labelClass}>Clothing when last seen</label>
            <input id="clothingDescription" {...register('clothingDescription')} className={inputClass} placeholder="e.g. Blue shirt, black jeans" />
          </div>

          <div>
            <label htmlFor="identifyingMarksText" className={labelClass}>Identifying marks (comma separated)</label>
            <input id="identifyingMarksText" {...register('identifyingMarksText')} className={inputClass} placeholder="e.g. Scar on left hand, mole on cheek" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lastKnownAddress" className={labelClass}>Last known location</label>
              <input id="lastKnownAddress" {...register('lastKnownAddress')} className={inputClass} placeholder="Area, city" />
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
            <label htmlFor="photoUrl" className={labelClass}>Photo URL (optional)</label>
            <input id="photoUrl" {...register('photoUrl')} className={inputClass} placeholder="https://..." />
            {errors.photoUrl && <p className="text-xs text-red-500 mt-1">{errors.photoUrl.message}</p>}
            <p className="text-xs text-ink-faint mt-1">
              Direct photo upload is coming soon — for now, paste a link to a photo.
            </p>
          </div>

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-trust text-paper py-2.5 rounded-full shadow-soft hover:bg-trust-deep transition-colors duration-200 disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Submit report'}
          </motion.button>
        </form>

        <p className="text-sm text-ink-faint mt-6">
          Prefer to report a sighting instead?{' '}
          <Link to="/report/sighting" className="text-trust hover:underline">Report a sighting</Link>
        </p>
      </motion.div>
    </div>
  );
}