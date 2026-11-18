/**
 * FILE: src/app/AppRoutes.jsx
 * PURPOSE: Routes under /app and the Flow 1 gate: signed in? → profile? → checked in today? → Today.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './AppState.jsx';
import Shell from './Shell.jsx';
import Prana from '../components/Prana.jsx';
import Welcome from '../pages/Welcome.jsx';
import Onboarding from '../pages/Onboarding.jsx';
import Checkin from '../pages/Checkin.jsx';
import Today from '../pages/Today.jsx';
import Progress from '../pages/Progress.jsx';
import Profile from '../pages/Profile.jsx';
import Hum from '../pages/Hum.jsx';
import Soon from '../pages/Soon.jsx';
import './app.css';

/** need: 'user' | 'profile' | 'checkin' — the minimum state a page requires; otherwise send the user back a step. */
function Guard({ need, children }) {
  const { user, loading, failed, retry, data, mood } = useApp();
  if (user === null) return <Welcome />;
  if (failed) return <main className="screen screen--center" role="alert"><Prana size={120} /><h1>Couldn't load your data</h1><p>Check your connection and try again.</p><button type="button" className="btn" onClick={retry}>Try again <span aria-hidden="true">→</span></button></main>;
  if (loading) return <main className="screen screen--center" aria-busy="true"><Prana size={120} /><p>Prana is getting ready…</p></main>;
  if (need !== 'user' && !data.profile) return <Navigate to="/app/onboarding" replace />;
  if (need === 'checkin' && !mood) return <Navigate to="/app/checkin" replace />;
  return children;
}

function Start() {
  const { data, mood } = useApp();
  return <Navigate to={!data.profile ? '/app/onboarding' : !mood ? '/app/checkin' : '/app/today'} replace />;
}

export default function AppRoutes() {
  return (
    <AppProvider>
      <Routes>
        <Route index element={<Guard need="user"><Start /></Guard>} />
        <Route path="onboarding" element={<Guard need="user"><Onboarding /></Guard>} />
        <Route path="checkin" element={<Guard need="profile"><Checkin /></Guard>} />
        <Route path="today" element={<Guard need="checkin"><Shell><Today /></Shell></Guard>} />
        <Route path="progress" element={<Guard need="profile"><Shell><Progress /></Shell></Guard>} />
        <Route path="profile" element={<Guard need="profile"><Shell><Profile /></Shell></Guard>} />
        <Route path="hum/:id" element={<Guard need="profile"><Hum /></Guard>} />
        <Route path="*" element={<Soon title="Page not found" notFound />} />
      </Routes>
    </AppProvider>
  );
}
