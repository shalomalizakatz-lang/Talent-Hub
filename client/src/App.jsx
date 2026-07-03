import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Layout } from './components/Layout.jsx';
import { Login } from './pages/Login.jsx';
import { JobSeekersList } from './pages/JobSeekersList.jsx';
import { JobSeekerForm } from './pages/JobSeekerForm.jsx';
import { JobSeekerDetail } from './pages/JobSeekerDetail.jsx';
import { OpportunitiesList } from './pages/OpportunitiesList.jsx';
import { OpportunityForm } from './pages/OpportunityForm.jsx';
import { OpportunityDetail } from './pages/OpportunityDetail.jsx';
import { Matches } from './pages/Matches.jsx';
import { PublicApply } from './pages/PublicApply.jsx';
import { PublicPostOpportunity } from './pages/PublicPostOpportunity.jsx';
import { NotFound } from './pages/NotFound.jsx';

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Public shareable links — no login required */}
      <Route path="/apply" element={<PublicApply />} />
      <Route path="/post-opportunity" element={<PublicPostOpportunity />} />

      <Route path="/" element={<Navigate to="/job-seekers" replace />} />
      <Route path="/job-seekers" element={<Protected><JobSeekersList /></Protected>} />
      <Route path="/job-seekers/new" element={<Protected><JobSeekerForm /></Protected>} />
      <Route path="/job-seekers/:id" element={<Protected><JobSeekerDetail /></Protected>} />
      <Route path="/job-seekers/:id/edit" element={<Protected><JobSeekerForm /></Protected>} />

      <Route path="/opportunities" element={<Protected><OpportunitiesList /></Protected>} />
      <Route path="/opportunities/new" element={<Protected><OpportunityForm /></Protected>} />
      <Route path="/opportunities/:id" element={<Protected><OpportunityDetail /></Protected>} />
      <Route path="/opportunities/:id/edit" element={<Protected><OpportunityForm /></Protected>} />

      <Route path="/matches" element={<Protected><Matches /></Protected>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
