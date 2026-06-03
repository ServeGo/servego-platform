import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import ProviderLayout from './layouts/ProviderLayout';
import AdminLayout from './layouts/AdminLayout';
import RequireAuth from './routes/RequireAuth';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceDetails from './pages/ServiceDetails';
import BecomePartner from './pages/BecomePartner';
import AboutServeGo from './pages/AboutServeGo';
import BookService from './pages/BookService';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProviderLogin from './pages/ProviderLogin';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import BookingHistory from './pages/BookingHistory';
import MyBookings from './pages/MyBookings';
import SavedServices from './pages/SavedServices';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import Support from './pages/Support';
import NotFound from './pages/NotFound';
import ScaffoldIndex from './scaffold/ScaffoldIndex';
import ScaffoldRouter from './scaffold/ScaffoldRouter';
import {
  FAQ,
  UpcomingServices,
  CancelledServices,
  EditProfile,
  AddressManagement,
  FavoriteProviders,
  Reviews,
  CustomerSupport,
  ChooseProvider,
  SelectDate,
  SelectTime,
  SelectAddress,
  BookingSummary,
  BookingConfirmation,
  BookingTracking,
  RescheduleBooking,
  CancelBooking,
  Invoice,
  ProviderDashboard,
  AvailableJobs,
  AcceptedJobs,
  AssignedJobs,
  InProgressJobs,
  CompletedJobs,
  Earnings,
  WithdrawEarnings,
  CustomerHistory,
  ProviderReviews,
  Availability,
  ProviderProfile,
  EditProviderProfile,
  ProviderSettings,
  ProviderSupport,
  AdminDashboard,
  Customers,
  CustomerDetails,
  Providers,
  ProviderDetails,
  ServicesManagement,
  AddService,
  EditService,
  BookingsManagement,
  BookingDetails,
  ReviewsManagement,
  PaymentsManagement,
  SupportTickets,
  Analytics,
  Revenue,
  Reports,
  AdminSettings,
} from './pages/PlatformPages';

const customerPages = [
  { path: '/upcoming-services', element: <UpcomingServices /> },
  { path: '/cancelled-services', element: <CancelledServices /> },
  { path: '/edit-profile', element: <EditProfile /> },
  { path: '/address-management', element: <AddressManagement /> },
  { path: '/favorite-providers', element: <FavoriteProviders /> },
  { path: '/reviews', element: <Reviews /> },
  { path: '/support-center', element: <CustomerSupport /> },
];

const bookingPages = [
  { path: '/choose-provider', element: <ChooseProvider /> },
  { path: '/select-date', element: <SelectDate /> },
  { path: '/select-time', element: <SelectTime /> },
  { path: '/select-address', element: <SelectAddress /> },
  { path: '/booking-summary', element: <BookingSummary /> },
  { path: '/booking-confirmation', element: <BookingConfirmation /> },
  { path: '/booking-tracking', element: <BookingTracking /> },
  { path: '/reschedule-booking', element: <RescheduleBooking /> },
  { path: '/cancel-booking', element: <CancelBooking /> },
  { path: '/invoice', element: <Invoice /> },
];

const providerPages = [
  { path: '/provider-dashboard', element: <ProviderDashboard /> },
  { path: '/available-jobs', element: <AvailableJobs /> },
  { path: '/accepted-jobs', element: <AcceptedJobs /> },
  { path: '/assigned-jobs', element: <AssignedJobs /> },
  { path: '/in-progress-jobs', element: <InProgressJobs /> },
  { path: '/completed-jobs', element: <CompletedJobs /> },
  { path: '/earnings', element: <Earnings /> },
  { path: '/withdraw-earnings', element: <WithdrawEarnings /> },
  { path: '/customer-history', element: <CustomerHistory /> },
  { path: '/provider-reviews', element: <ProviderReviews /> },
  { path: '/availability', element: <Availability /> },
  { path: '/provider-profile', element: <ProviderProfile /> },
  { path: '/edit-provider-profile', element: <EditProviderProfile /> },
  { path: '/provider-settings', element: <ProviderSettings /> },
  { path: '/provider-support', element: <ProviderSupport /> },
];

const adminPages = [
  { path: '/admin-dashboard', element: <AdminDashboard /> },
  { path: '/customers', element: <Customers /> },
  { path: '/customer-details', element: <CustomerDetails /> },
  { path: '/providers', element: <Providers /> },
  { path: '/provider-details', element: <ProviderDetails /> },
  { path: '/services-management', element: <ServicesManagement /> },
  { path: '/add-service', element: <AddService /> },
  { path: '/edit-service', element: <EditService /> },
  { path: '/bookings-management', element: <BookingsManagement /> },
  { path: '/booking-details', element: <BookingDetails /> },
  { path: '/reviews-management', element: <ReviewsManagement /> },
  { path: '/payments-management', element: <PaymentsManagement /> },
  { path: '/support-tickets', element: <SupportTickets /> },
  { path: '/analytics', element: <Analytics /> },
  { path: '/revenue', element: <Revenue /> },
  { path: '/reports', element: <Reports /> },
  { path: '/admin-settings', element: <AdminSettings /> },
];

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:id" element={<ServiceDetails />} />
          <Route path="book-service" element={<BookService />} />
          <Route path="become-partner" element={<BecomePartner />} />
          <Route path="scaffold/*" element={<ScaffoldRouter />} />
          <Route path="about" element={<AboutServeGo />} />
          <Route path="contact" element={<Contact />} />
          <Route path="support" element={<Support />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="blog" element={<Blog />} />
          <Route path="create-account" element={<CreateAccount />} />
          <Route path="signup" element={<CreateAccount />} />
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="provider-login" element={<ProviderLogin />} />
          <Route path="provider-signup" element={<Navigate to="/become-partner" replace />} />
          <Route path="admin-login" element={<AdminLogin />} />
        </Route>

        <Route path="/" element={<RequireAuth allowedRoles={[ 'customer' ]}><CustomerLayout /></RequireAuth>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="booking-history" element={<BookingHistory />} />
          <Route path="profile" element={<Profile />} />
          <Route path="saved-services" element={<SavedServices />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />

          {customerPages.map((route) => (
            <Route key={route.path} path={route.path.slice(1)} element={route.element} />
          ))}

          {bookingPages.map((route) => (
            <Route key={route.path} path={route.path.slice(1)} element={route.element} />
          ))}
        </Route>

        <Route path="/" element={<RequireAuth allowedRoles={[ 'provider' ]}><ProviderLayout /></RequireAuth>}>
          {providerPages.map((route) => (
            <Route key={route.path} path={route.path.slice(1)} element={route.element} />
          ))}
        </Route>

        <Route path="/" element={<RequireAuth allowedRoles={[ 'admin' ]}><AdminLayout /></RequireAuth>}>
          {adminPages.map((route) => (
            <Route key={route.path} path={route.path.slice(1)} element={route.element} />
          ))}
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
