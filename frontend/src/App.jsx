import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './features/home/HomePage.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import PoliceDashboardPage from './features/police/PoliceDashboardPage.jsx';
import ReportMissingPersonPage from './features/missingPersons/ReportMissingPersonPage.jsx';
import MissingPersonDetailPage from './features/missingPersons/MissingPersonDetailPage.jsx';
import ReportSightingPage from './features/sightings/ReportSightingPage.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/police/dashboard"
          element={
            <ProtectedRoute allowedRoles={['police']}>
              <PoliceDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/missing-person"
          element={
            <ProtectedRoute>
              <ReportMissingPersonPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/missing-persons/:id"
          element={
            <ProtectedRoute>
              <MissingPersonDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Open to anonymous visitors too — matches "Report a sighting
            — anonymously, if you prefer" on the home page. */}
        <Route path="/report/sighting" element={<ReportSightingPage />} />
        {/* Feature routes (matches, found persons, etc.) will be added
            here as each module is implemented, per the approved API
            Specification. */}
      </Routes>
    </MainLayout>
  );
}