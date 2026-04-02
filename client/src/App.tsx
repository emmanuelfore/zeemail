import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import ConfirmPage from './pages/ConfirmPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { OverviewPage } from './pages/admin/OverviewPage';
import { ClientsPage } from './pages/admin/ClientsPage';
import { ClientDetailPage } from './pages/admin/ClientDetailPage';
import { MailboxesPage } from './pages/admin/MailboxesPage';
import { InvoicesPage } from './pages/admin/InvoicesPage';
import { LeadsPage } from './pages/admin/LeadsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { CrmOverviewPage } from './pages/admin/crm/CrmOverviewPage';
import { CrmContactsPage } from './pages/admin/crm/CrmContactsPage';
import { CrmFinderPage } from './pages/admin/crm/CrmFinderPage';
import { CrmPipelinePage } from './pages/admin/crm/CrmPipelinePage';
import { CrmBlastPage } from './pages/admin/crm/CrmBlastPage';
import { PortalLayout } from './components/portal/PortalLayout';
import { PortalDashboardPage } from './pages/portal/PortalDashboardPage';
import { PortalMailboxesPage } from './pages/portal/PortalMailboxesPage';
import { PortalAccountPage } from './pages/portal/PortalAccountPage';
import { PortalInvoicesPage } from './pages/portal/PortalInvoicesPage';
import { PortalSupportPage } from './pages/portal/PortalSupportPage';
import { PortalTicketDetailPage } from './pages/portal/PortalTicketDetailPage';
import { AdminSupportPage } from './pages/admin/AdminSupportPage';
import { AdminTicketDetailPage } from './pages/admin/AdminTicketDetailPage';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/confirm" element={<ConfirmPage />} />

        {/* Admin routes — require admin role */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="mailboxes" element={<MailboxesPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="support" element={<AdminSupportPage />} />
          <Route path="support/:id" element={<AdminTicketDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="crm" element={<CrmOverviewPage />} />
          <Route path="crm/contacts" element={<CrmContactsPage />} />
          <Route path="crm/finder" element={<CrmFinderPage />} />
          <Route path="crm/pipeline" element={<CrmPipelinePage />} />
          <Route path="crm/blast" element={<CrmBlastPage />} />
        </Route>

        {/* Portal routes — require client role */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute requiredRole="client">
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PortalDashboardPage />} />
          <Route path="mailboxes" element={<PortalMailboxesPage />} />
          <Route path="account" element={<PortalAccountPage />} />
          <Route path="invoices" element={<PortalInvoicesPage />} />
          <Route path="support" element={<PortalSupportPage />} />
          <Route path="support/:id" element={<PortalTicketDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
