import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Layout from '../Layout';
import AboutPage from '../aboutpage/AboutPage';
import CareersPage from '../aboutpage/CareersPage';
import ContactPage from '../aboutpage/ContactPage';
import FaqPage from '../aboutpage/FaqPage';
import PrivacyPolicyPage from '../aboutpage/PrivacyPolicyPage';
import TermsPage from '../aboutpage/TermsPage';
import ActivateAccount from '../assets/pages/ActivateAccount';
import CategoryChildren from '../assets/pages/CategoryChildren';
import Checkout from '../assets/pages/Checkout';
import ForgotPassword from '../assets/pages/ForgotPassword';
import Home from '../assets/pages/Home';
import Login from '../assets/pages/Login';
import LogoutAll from '../assets/pages/LogoutAll';
import OrderDetail from '../assets/pages/OrderDetail';
import OrderHistory from '../assets/pages/OrderHistory';
import Payment from '../assets/pages/Payment';
import PaymentRedirect from '../assets/pages/PaymentRedirect';
import ProductDetail from '../assets/pages/ProductDetail';
import Products from '../assets/pages/Products';
import ProductsByCategory from '../assets/pages/ProductsByCategory';
import Register from '../assets/pages/Register';
import UserCenter from '../assets/pages/UserCenter';
import UserInfo from '../assets/pages/UserInfo';
import VNPayReturn from '../assets/pages/VNPayReturn';
import AdminLayout from '../components/AdminLayout';
import { ROUTES } from '../constants/routes';

// Admin Components
import AdminAnalyticsDashboard from '../assets/pages/AdminAnalyticsDashboard';
import AdminCategoryManagement from '../assets/pages/AdminCategoryManagement';
import AdminDashboard from '../assets/pages/AdminDashboard';
import AdminDeviceManager from '../assets/pages/AdminDeviceManager';
import AdminDisputeManagement from '../assets/pages/AdminDisputeManagement';
import AdminKycManagement from '../assets/pages/AdminKycManagement';
import AdminOrderManagement from '../assets/pages/AdminOrderManagement';
import AdminOverview from '../assets/pages/AdminOverview';
import AdminProductManagement from '../assets/pages/AdminProductManagement';
import AdminRefundManagement from '../assets/pages/AdminRefundManagement';
import AdminReports from '../assets/pages/AdminReports';
import AdminSettings from '../assets/pages/AdminSettings';
import AdminUserManagement from '../assets/pages/AdminUserManagement';
import ProductSearch from '../assets/pages/ProductSearch';
import ResetPassword from '../assets/pages/ResetPassword';
import RoutesOverview from '../assets/pages/RoutesOverview';
import { ChatDebug } from '../components/ChatDebug';

// Error boundary component
const ErrorPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Oops!</h1>
        <p className="text-gray-600 mb-8">Sorry, an unexpected error has occurred.</p>
        <a
          href={ROUTES.HOME}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
        >
          Go Back Home
        </a>
      </div>
    </div>
  );
};


// Create the router configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register", 
        element: <Register />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },

      {
        path: "activate",
        element: <ActivateAccount />,
      },
      {
        path: "chat-debug",
        element: <ChatDebug />,
      },
      {
        path: "logout-all",
        element: <LogoutAll />,
      },
      {
        path: "user-center",
        element: <UserCenter />,
      },
      {
        path: "user-info",
        element: <UserInfo />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "contact",
        element: <ContactPage />,
      },
      {
        path: "careers",
        element: <CareersPage />,
      },
      {
        path: "faq",
        element: <FaqPage />,
      },
      {
        path: "privacy-policy",
        element: <PrivacyPolicyPage />,
      },
      {
        path: "terms",
        element: <TermsPage />,
      },
      {
        path: "products",
        element: <Products />,
      },
      {
        path: "category/:id",
        element: <CategoryChildren />,
      },
      {
        path: "products/category/:categoryId",
        element: <ProductsByCategory />,
      },
      {
        path: "product/:productId",
        element: <ProductDetail />,
      },
      {
        path: "checkout",
        element: <Checkout />,
      },
      {
        path: "payment",
        element: <Payment />,
      },
      {
        path: "payment-redirect",
        element: <PaymentRedirect />,
      },
      {
        path: "vnpay-return",
        element: <VNPayReturn />,
      },
      {
        path: "order-history",
        element: <OrderHistory />,
      },
      {
        path: "order-detail/:orderId",
        element: <OrderDetail />,
      },
      {
        path: "search",
        element: <ProductSearch />,
      },
      {
        path: "routes-overview",
        element: <RoutesOverview />,
      },
      {
        path: "reset-password",
        element: <ResetPassword />,
      },
    ],
  },
  // Admin Routes với layout riêng
  {
    path: "/admin",
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <AdminOverview />,
      },
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "users",
        element: <AdminUserManagement />,
      },
      {
        path: "kyc",
        element: <AdminKycManagement />,
      },
      {
        path: "devices", 
        element: <AdminDeviceManager />,
      },
      {
        path: "products",
        element: <AdminProductManagement />,
      },
      {
        path: "categories",
        element: <AdminCategoryManagement />,
      },
      {
        path: "refunds",
        element: <AdminRefundManagement />,
      },
      {
        path: "analytics",
        element: <AdminAnalyticsDashboard />,
      },
      {
        path: "disputes",
        element: <AdminDisputeManagement />,
      },
      {
        path: "orders",
        element: <AdminOrderManagement />,
      },
      {
        path: "settings",
        element: <AdminSettings />,
      },
      {
        path: "reports",
        element: <AdminReports />,
      },
    ],
  },
]);


const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
