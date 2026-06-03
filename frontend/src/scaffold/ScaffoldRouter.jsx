import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ScaffoldLayout from './ScaffoldLayout';
import ScaffoldIndex from './ScaffoldIndex';

// Auth
import GoogleLogin from './Auth/GoogleLogin';
import OTPVerification from './Auth/OTPVerification';
import ResetPasswordSuccess from './Auth/ResetPasswordSuccess';

// Customer
import CustomerDashboard from './Customer/CustomerDashboard';
import MyBookings from './Customer/MyBookings';
import BookingDetails from './Customer/BookingDetails';
import BookingTracking from './Customer/BookingTracking';
import NotificationsPage from './Customer/Notifications';
import CustomerProfile from './Customer/Profile';
import CustomerSettings from './Customer/Settings';
import CustomerSupportTickets from './Customer/SupportTickets';
import CustomerReviews from './Customer/Reviews';

// Provider
import ProviderDashboard from './Provider/ProviderDashboard';
import AvailableJobs from './Provider/AvailableJobs';
import AssignedJobs from './Provider/AssignedJobs';
import CompletedJobs from './Provider/CompletedJobs';
import ProviderEarnings from './Provider/Earnings';
import WithdrawEarnings from './Provider/WithdrawEarnings';
import ProviderReviews from './Provider/Reviews';
import AvailabilityManagement from './Provider/AvailabilityManagement';
import ProviderProfile from './Provider/Profile';
import ProviderSettings from './Provider/Settings';

// Admin
import AdminDashboard from './Admin/AdminDashboard';
import AdminCustomers from './Admin/Customers';
import AdminProviders from './Admin/Providers';
import AdminServices from './Admin/Services';
import AdminBookings from './Admin/Bookings';
import AdminPayments from './Admin/Payments';
import AdminReviews from './Admin/Reviews';
import AdminAnalytics from './Admin/Analytics';
import AdminReports from './Admin/Reports';

// Common
import SidebarCommon from './common/SidebarCommon';
import NotificationDropdown from './common/NotificationDropdown';
import ProfileDropdown from './common/ProfileDropdown';
import SearchBar from './common/SearchBar';
import FiltersPanel from './common/FiltersPanel';
import ModalPlaceholder from './common/ModalPlaceholder';
import Loader from './common/Loader';
import EmptyState from './common/EmptyState';
import ErrorState from './common/ErrorState';
import NotFound404 from './common/NotFound404';

// Legal
import PrivacyPolicyPage from './legal/PrivacyPolicy';
import TermsPage from './legal/Terms';
import FAQPage from './legal/FAQ';
import ContactUs from './legal/ContactUs';

// UX
import RoleBasedNav from './ux/RoleBasedNav';
import Breadcrumbs from './ux/Breadcrumbs';
import Toasts from './ux/Toasts';
import SuccessScreen from './ux/SuccessScreen';
import ConfirmationDialog from './ux/ConfirmationDialog';

export default function ScaffoldRouter(){
  return (
    <ScaffoldLayout>
      <Routes>
        <Route index element={<ScaffoldIndex/>} />

        <Route path="auth/google-login" element={<GoogleLogin/>} />
        <Route path="auth/otp-verification" element={<OTPVerification/>} />
        <Route path="auth/reset-password-success" element={<ResetPasswordSuccess/>} />

        <Route path="customer/dashboard" element={<CustomerDashboard/>} />
        <Route path="customer/my-bookings" element={<MyBookings/>} />
        <Route path="customer/booking-details" element={<BookingDetails/>} />
        <Route path="customer/booking-tracking" element={<BookingTracking/>} />
        <Route path="customer/notifications" element={<NotificationsPage/>} />
        <Route path="customer/profile" element={<CustomerProfile/>} />
        <Route path="customer/settings" element={<CustomerSettings/>} />
        <Route path="customer/support-tickets" element={<CustomerSupportTickets/>} />
        <Route path="customer/reviews" element={<CustomerReviews/>} />

        <Route path="provider/dashboard" element={<ProviderDashboard/>} />
        <Route path="provider/available-jobs" element={<AvailableJobs/>} />
        <Route path="provider/assigned-jobs" element={<AssignedJobs/>} />
        <Route path="provider/completed-jobs" element={<CompletedJobs/>} />
        <Route path="provider/earnings" element={<ProviderEarnings/>} />
        <Route path="provider/withdraw-earnings" element={<WithdrawEarnings/>} />
        <Route path="provider/reviews" element={<ProviderReviews/>} />
        <Route path="provider/availability" element={<AvailabilityManagement/>} />
        <Route path="provider/profile" element={<ProviderProfile/>} />
        <Route path="provider/settings" element={<ProviderSettings/>} />

        <Route path="admin/dashboard" element={<AdminDashboard/>} />
        <Route path="admin/customers" element={<AdminCustomers/>} />
        <Route path="admin/providers" element={<AdminProviders/>} />
        <Route path="admin/services" element={<AdminServices/>} />
        <Route path="admin/bookings" element={<AdminBookings/>} />
        <Route path="admin/payments" element={<AdminPayments/>} />
        <Route path="admin/reviews" element={<AdminReviews/>} />
        <Route path="admin/analytics" element={<AdminAnalytics/>} />
        <Route path="admin/reports" element={<AdminReports/>} />

        <Route path="common/sidebar" element={<SidebarCommon/>} />
        <Route path="common/notifications" element={<NotificationDropdown/>} />
        <Route path="common/profile" element={<ProfileDropdown/>} />
        <Route path="common/search" element={<SearchBar/>} />
        <Route path="common/filters" element={<FiltersPanel/>} />
        <Route path="common/modal" element={<ModalPlaceholder/>} />
        <Route path="common/loader" element={<Loader/>} />
        <Route path="common/empty" element={<EmptyState/>} />
        <Route path="common/error" element={<ErrorState/>} />
        <Route path="common/404" element={<NotFound404/>} />

        <Route path="legal/privacy" element={<PrivacyPolicyPage/>} />
        <Route path="legal/terms" element={<TermsPage/>} />
        <Route path="legal/faq" element={<FAQPage/>} />
        <Route path="legal/contact" element={<ContactUs/>} />

        <Route path="ux/role-nav" element={<RoleBasedNav/>} />
        <Route path="ux/breadcrumbs" element={<Breadcrumbs/>} />
        <Route path="ux/toasts" element={<Toasts/>} />
        <Route path="ux/success" element={<SuccessScreen/>} />
        <Route path="ux/confirm" element={<ConfirmationDialog/>} />

        <Route path="*" element={<ScaffoldIndex/>} />
      </Routes>
    </ScaffoldLayout>
  );
}
