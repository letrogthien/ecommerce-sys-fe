import React, { useEffect, useState } from 'react';
import type { components as ProductComponents } from '../../api-types/productService';
import type { components as TransactionComponents } from '../../api-types/transactionService';
import AddProductModal from '../../components/AddProductModal/AddProductModal';
import AddVariantModal from '../../components/AddVariantModal/AddVariantModal';
import EditProductModal from '../../components/EditProductModal/EditProductModal';
import EditVariantModal from '../../components/EditVariantModal/EditVariantModal';
import ImageManagerModal from '../../components/ImageManagerModal/ImageManagerModal';
import OrderDetailsModal from '../../components/OrderDetailsModal/OrderDetailsModal';
import UploadProofModal from '../../components/UploadProofModal/UploadProofModal';
import { useUser } from '../../context/UserContext';
import {
  createProductVariant,
  deleteProduct,
  deleteProductImage,
  deleteProductVariant,
  getProductImages,
  getProductsBySeller,
  getVariantsByProduct,
  uploadProductImages
} from '../../services/productApi';
import {
  getAnalyticsOverview,
  getCustomerAnalytics,
  getOrdersBySeller,
  getRevenueChartData,
  getTopProducts
} from '../../services/transactionApi';
import SellerRefundManagement from './SellerRefundManagement';

type ProductDto = ProductComponents['schemas']['ProductDto'];
type ProductVariantDto = ProductComponents['schemas']['ProductVariantDto'];
type ProductImageDto = ProductComponents['schemas']['ProductImageDto'];
type VariantCreateRq = ProductComponents['schemas']['VariantCreateRq'];
type OrderDto = TransactionComponents['schemas']['OrderDto'];

// Analytics Types
type AnalyticsOverviewDTO = TransactionComponents['schemas']['AnalyticsOverviewDTO'];
type TopProductDTO = TransactionComponents['schemas']['TopProductDTO'];
type RevenueChartDataDTO = TransactionComponents['schemas']['RevenueChartDataDTO'];
type CustomerAnalyticsDTO = TransactionComponents['schemas']['CustomerAnalyticsDTO'];

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRefunds: number;
  pendingRefunds: number;
}

// Utility function for currency formatting
const formatCurrency = (amount: number, compact: boolean = false): string => {
  if (compact) {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Move components outside to avoid re-creation
const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({
  title, value, icon, color
}) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${color} mr-4`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void; badge?: number }> = ({
  label, active, onClick, badge
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium rounded-lg transition-colors relative ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
    }`}
  >
    {label}
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

const SellerDashboard: React.FC = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRefunds: 0,
    pendingRefunds: 0,
  });
  const [recentProducts, setRecentProducts] = useState<ProductDto[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDto[]>([]);
  const [productsPagination, setProductsPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [productsLoading, setProductsLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderDto[]>([]);
  const [allOrders, setAllOrders] = useState<OrderDto[]>([]);
  const [cachedAllOrders, setCachedAllOrders] = useState<OrderDto[]>([]); // Cache tất cả đơn hàng
  const [filteredOrders, setFilteredOrders] = useState<OrderDto[]>([]); // Đơn hàng sau khi filter
  const [ordersPagination, setOrdersPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersDataLoaded, setOrdersDataLoaded] = useState(false); // Flag để biết đã load data chưa
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'refunds' | 'analytics'>('overview');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{productId: string, productName: string} | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariantDto[]>>({});
  const [variantsLoading, setVariantsLoading] = useState<Record<string, boolean>>({});
  const [editingVariant, setEditingVariant] = useState<{variant: ProductVariantDto, productId: string} | null>(null);
  const [isEditVariantModalOpen, setIsEditVariantModalOpen] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  
  // New states for variant and image management
  const [isAddVariantModalOpen, setIsAddVariantModalOpen] = useState(false);
  const [addingVariantProductId, setAddingVariantProductId] = useState<string | null>(null);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [lastVariantSubmissionId, setLastVariantSubmissionId] = useState<string | null>(null);
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [managingImagesProductId, setManagingImagesProductId] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Record<string, ProductImageDto[]>>({});
  const [imagesLoading, setImagesLoading] = useState<Record<string, boolean>>({});
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Order management states
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isUploadProofModalOpen, setIsUploadProofModalOpen] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');

  // Analytics states
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverviewDTO | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductDTO[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<RevenueChartDataDTO[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalyticsDTO | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<number>(30); // Default 30 days

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch seller's products
      const productsData = await getProductsBySeller(0, 20);
      
      // Fetch orders by seller - chỉ lấy đơn hàng đã thanh toán trở lên
      const ordersData = await getOrdersBySeller(user?.id || '', {
        page: 0,
        limit: 100  // Tăng limit để tính stats chính xác hơn
      });

      // Lọc chỉ lấy đơn hàng đã thanh toán hoặc đã gửi hàng
      const relevantOrders = ordersData.orders.filter(order => 
        ['PAID', 'DELIVERED', 'COMPLETED'].includes(order.status || '')
      );

      // Calculate stats từ các đơn hàng có ý nghĩa
      const totalRevenue = relevantOrders
        .filter(order => ['DELIVERED', 'COMPLETED'].includes(order.status || ''))
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      const orderStatusCounts = relevantOrders.reduce((acc, order) => {
        acc[order.status || 'UNKNOWN'] = (acc[order.status || 'UNKNOWN'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats({
        totalProducts: productsData.totalElements,
        totalOrders: relevantOrders.length,
        totalRevenue,
        pendingOrders: orderStatusCounts['PAID'] || 0, // Đơn cần gửi hàng
        completedOrders: (orderStatusCounts['DELIVERED'] || 0) + (orderStatusCounts['COMPLETED'] || 0),
        cancelledOrders: 0, // Không hiển thị đơn hủy nữa
        totalRefunds: 5, // Mock data - sẽ thay bằng API thực
        pendingRefunds: 2, // Mock data - sẽ thay bằng API thực
      });

      setRecentProducts(productsData.products.slice(0, 5));
      setRecentOrders(relevantOrders.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProductSuccess = () => {
    // Refresh dashboard data after adding product
    fetchDashboardData();
    // Refresh products list if on products tab
    if (activeTab === 'products') {
      fetchSellerProducts(0);
    }
    // Switch to products tab to show the new product
    setActiveTab('products');
    // Show success notification
    setNotification({ message: 'Sản phẩm đã được thêm thành công!', type: 'success' });
    // Auto hide notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchSellerProducts = async (page: number = 0, size: number = 10) => {
    try {
      setProductsLoading(true);
      const productsData = await getProductsBySeller(page, size);
      setAllProducts(productsData.products);
      setProductsPagination({
        currentPage: productsData.currentPage,
        totalPages: productsData.totalPages,
        totalElements: productsData.totalElements,
      });
    } catch (error) {
      console.error('Error fetching seller products:', error);
      setNotification({ message: 'Lỗi khi tải danh sách sản phẩm', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch products when switching to products tab
  useEffect(() => {
    if (activeTab === 'products') {
      fetchSellerProducts(0);
    }
  }, [activeTab]);

  // Fetch orders when switching to orders tab
  useEffect(() => {
    if (activeTab === 'orders' && !ordersDataLoaded) {
      // Chỉ load data một lần khi vào tab orders
      loadAllOrdersOnce();
    } else if (activeTab === 'orders' && ordersDataLoaded) {
      // Nếu đã có data, chỉ filter lại
      filterOrdersByStatus(orderStatusFilter);
    }
  }, [activeTab, ordersDataLoaded]);

  // Filter orders khi thay đổi status filter
  useEffect(() => {
    if (activeTab === 'orders' && ordersDataLoaded) {
      filterOrdersByStatus(orderStatusFilter);
    }
  }, [orderStatusFilter, ordersDataLoaded]);

  const handleEditProduct = (product: ProductDto) => {
    setEditingProduct(product);
    setIsEditProductModalOpen(true);
  };

  const handleEditProductSuccess = () => {
    // Refresh products list
    fetchSellerProducts(productsPagination.currentPage);
    // Show success notification
    setNotification({ message: 'Sản phẩm đã được cập nhật thành công!', type: 'success' });
    // Auto hide notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleProductExpand = async (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
      
      // Load variants if not already loaded
      if (!productVariants[productId]) {
        setVariantsLoading(prev => ({ ...prev, [productId]: true }));
        try {
          const variants = await getVariantsByProduct(productId);
          setProductVariants(prev => ({
            ...prev,
            [productId]: variants
          }));
        } catch (error) {
          console.error('Error loading product variants:', error);
          setNotification({ message: 'Lỗi khi tải biến thể sản phẩm', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
        } finally {
          setVariantsLoading(prev => ({ ...prev, [productId]: false }));
        }
      }
    }
    
    setExpandedProducts(newExpanded);
  };

  const handleEditVariant = (variant: ProductVariantDto, productId: string) => {
    setEditingVariant({ variant, productId });
    setIsEditVariantModalOpen(true);
  };

  const handleEditVariantSuccess = async () => {
    if (!editingVariant) return;
    
    // Refresh variants list for this product
    try {
      const variants = await getVariantsByProduct(editingVariant.productId);
      setProductVariants(prev => ({
        ...prev,
        [editingVariant.productId]: variants
      }));
      
      setNotification({ message: 'Biến thể đã được cập nhật thành công!', type: 'success' });
    } catch (error) {
      console.error('Error refreshing variants:', error);
      setNotification({ message: 'Cập nhật thành công nhưng không thể tải lại danh sách', type: 'error' });
    }
    
    setTimeout(() => setNotification(null), 3000);
  };

  // Add Variant Handler
  const handleAddVariant = (productId: string) => {
    setAddingVariantProductId(productId);
    setIsAddVariantModalOpen(true);
  };

  const handleAddVariantSuccess = async () => {
    if (!addingVariantProductId) return;
    
    // Refresh variants list for this product
    try {
      const variants = await getVariantsByProduct(addingVariantProductId);
      setProductVariants(prev => ({
        ...prev,
        [addingVariantProductId]: variants
      }));
      
      setNotification({ message: 'Biến thể đã được thêm thành công!', type: 'success' });
    } catch (error) {
      console.error('Error refreshing variants:', error);
      setNotification({ message: 'Có lỗi xảy ra khi làm mới danh sách biến thể', type: 'error' });
    }
    
    setTimeout(() => setNotification(null), 3000);
    setIsAddVariantModalOpen(false);
    setAddingVariantProductId(null);
  };

  const handleCreateVariant = async (variantData: VariantCreateRq) => {
    // Create a unique submission ID based on variant data
    const submissionId = `${variantData.productId}-${variantData.sku}-${JSON.stringify(variantData.attributes)}-${variantData.price}-${variantData.availableQty}`;
    
    console.log('=== SELLERDASHBOARD HANDLING CREATE VARIANT ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Submission ID:', submissionId);
    console.log('Last submission ID:', lastVariantSubmissionId);
    console.log('Received variantData:', variantData);
    console.log('Current addingVariantProductId:', addingVariantProductId);
    console.log('Current creatingVariant state:', creatingVariant);
    
    // Check if we're already creating a variant OR if this is a duplicate submission
    if (creatingVariant || submissionId === lastVariantSubmissionId) {
      console.log('Already creating variant or duplicate submission, aborting...');
      return;
    }
    
    setLastVariantSubmissionId(submissionId);
    setCreatingVariant(true);
    
    try {
      console.log('Calling createProductVariant API...');
      const result = await createProductVariant(variantData);
      console.log('API result:', result);
      
      // Don't call handleAddVariantSuccess here to avoid double execution
      // Instead, just refresh variants and show success message
      console.log('Refreshing variants list...');
      if (addingVariantProductId) {
        const variants = await getVariantsByProduct(addingVariantProductId);
        setProductVariants(prev => ({
          ...prev,
          [addingVariantProductId]: variants
        }));
      }
      
      setNotification({ message: 'Biến thể đã được thêm thành công!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      console.log('=== VARIANT CREATION COMPLETED ===');
    } catch (error) {
      console.error('=== ERROR IN SELLERDASHBOARD CREATE VARIANT ===', error);
      setNotification({ message: 'Có lỗi xảy ra khi tạo biến thể', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      throw error;
    } finally {
      setCreatingVariant(false);
      // Clear the submission ID after a short delay to allow for new submissions
      setTimeout(() => setLastVariantSubmissionId(null), 2000);
    }
  };

  // Image Management Handlers
  const handleManageImages = async (productId: string) => {
    setManagingImagesProductId(productId);
    setIsImageManagerOpen(true);
    
    // Load images if not already loaded
    if (!productImages[productId]) {
      setImagesLoading(prev => ({ ...prev, [productId]: true }));
      try {
        const images = await getProductImages(productId);
        setProductImages(prev => ({ ...prev, [productId]: images }));
      } catch (error) {
        console.error('Error loading product images:', error);
        setNotification({ message: 'Có lỗi xảy ra khi tải hình ảnh', type: 'error' });
      } finally {
        setImagesLoading(prev => ({ ...prev, [productId]: false }));
      }
    }
  };

  const handleUploadImages = async (productId: string, files: File[]) => {
    if (files.length === 0) return;
    
    setUploadingImages(prev => ({ ...prev, [productId]: true }));
    try {
      await uploadProductImages(productId, files);
      
      // Refresh images
      const images = await getProductImages(productId);
      setProductImages(prev => ({ ...prev, [productId]: images }));
      
      setNotification({ message: 'Hình ảnh đã được tải lên thành công!', type: 'success' });
    } catch (error) {
      console.error('Error uploading images:', error);
      setNotification({ message: 'Có lỗi xảy ra khi tải lên hình ảnh', type: 'error' });
    } finally {
      setUploadingImages(prev => ({ ...prev, [productId]: false }));
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteImage = async (productId: string, imageId: string) => {
    setDeletingImageId(imageId);
    try {
      await deleteProductImage(productId, imageId);
      
      // Refresh images
      const images = await getProductImages(productId);
      setProductImages(prev => ({ ...prev, [productId]: images }));
      
      setNotification({ message: 'Hình ảnh đã được xóa thành công!', type: 'success' });
    } catch (error) {
      console.error('Error deleting image:', error);
      setNotification({ message: 'Có lỗi xảy ra khi xóa hình ảnh', type: 'error' });
    } finally {
      setDeletingImageId(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteVariant = async (variantId: string, variantSku: string, productId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa biến thể "${variantSku}"?`)) {
      return;
    }

    try {
      setDeletingVariantId(variantId);
      
      await deleteProductVariant(variantId);
      
      setNotification({ message: `Đã xóa biến thể "${variantSku}" thành công!`, type: 'success' });
      
      // Refresh variants list for this product
      const variants = await getVariantsByProduct(productId);
      setProductVariants(prev => ({
        ...prev,
        [productId]: variants
      }));
      
    } catch (error) {
      console.error('Error deleting variant:', error);
      setNotification({ message: `Lỗi khi xóa biến thể "${variantSku}"`, type: 'error' });
    } finally {
      setDeletingVariantId(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    setShowDeleteConfirm({ productId, productName });
  };

  const confirmDeleteProduct = async () => {
    if (!showDeleteConfirm) return;

    const { productId, productName } = showDeleteConfirm;

    try {
      setDeletingProductId(productId);
      
      // Call delete API
      await deleteProduct(productId);
      
      setNotification({ message: `Đã xóa sản phẩm "${productName}" thành công!`, type: 'success' });
      
      // Refresh products list
      await fetchSellerProducts(productsPagination.currentPage);
      
    } catch (error) {
      console.error('Error deleting product:', error);
      setNotification({ message: `Lỗi khi xóa sản phẩm "${productName}"`, type: 'error' });
    } finally {
      setDeletingProductId(null);
      setShowDeleteConfirm(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      case 'PROCESSING': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Order management functions
  const handleViewOrderDetails = (order: OrderDto) => {
    setSelectedOrder(order);
    setIsOrderDetailsModalOpen(true);
  };

  const handleUploadProof = (order: OrderDto) => {
    setSelectedOrder(order);
    setIsUploadProofModalOpen(true);
  };

  const handleUploadProofSuccess = (updatedOrder: OrderDto) => {
    // Update the order in the list
    setAllOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    
    // Update cached orders
    setCachedAllOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
    
    // Update recent orders if this order is in there
    setRecentOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );

    setNotification({ 
      message: 'Đã upload bằng chứng giao hàng thành công!', 
      type: 'success' 
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load tất cả đơn hàng một lần và cache lại
  const loadAllOrdersOnce = async () => {
    try {
      setOrdersLoading(true);
      
      const ordersData = await getOrdersBySeller(user?.id || '', {
        page: 0,
        limit: 1000  // Lấy nhiều hơn để có tất cả đơn hàng
      });
      
      // Lọc chỉ lấy đơn hàng đã thanh toán trở lên
      const relevantOrders = ordersData.orders.filter(order => 
        ['PAID', 'DELIVERED', 'COMPLETED'].includes(order.status || '')
      );
      
      // Cache all orders
      setCachedAllOrders(relevantOrders);
      
      // Set initial display (trang đầu tiên của tất cả đơn hàng)
      const pageSize = 10;
      const firstPageData = relevantOrders.slice(0, pageSize);
      setAllOrders(firstPageData);
      setFilteredOrders(relevantOrders);
      
      setOrdersPagination({
        currentPage: 0,
        totalPages: Math.ceil(relevantOrders.length / pageSize),
        totalElements: relevantOrders.length,
      });
      
      setOrdersDataLoaded(true);
      
    } catch (error) {
      console.error('Error loading all orders:', error);
      setNotification({ message: 'Lỗi khi tải danh sách đơn hàng', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Filter orders từ cached data
  const filterOrdersByStatus = (status: string) => {
    let filtered = cachedAllOrders;
    
    if (status) {
      filtered = cachedAllOrders.filter(order => order.status === status);
    }
    
    setFilteredOrders(filtered);
    // Hiển thị trang đầu tiên của filtered data
    const pageSize = 10;
    const paginatedData = filtered.slice(0, pageSize);
    setAllOrders(paginatedData);
    
    setOrdersPagination({
      currentPage: 0,
      totalPages: Math.ceil(filtered.length / pageSize),
      totalElements: filtered.length,
    });
  };

  // Pagination cho cached data
  const handleOrdersPagination = (page: number) => {
    const pageSize = 10;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    
    const paginatedData = filteredOrders.slice(startIndex, endIndex);
    setAllOrders(paginatedData);
    
    setOrdersPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  // Load analytics data
  const loadAnalyticsData = async (period: number = analyticsPeriod) => {
    if (!user?.id) return;
    
    try {
      setAnalyticsLoading(true);
      
      // Load all analytics data in parallel
      const [overview, products, chartData, customers] = await Promise.all([
        getAnalyticsOverview(user.id, period).catch(err => {
          console.error('Error loading analytics overview:', err);
          return null;
        }),
        getTopProducts(user.id, period, 5).catch(err => {
          console.error('Error loading top products:', err);
          return [];
        }),
        getRevenueChartData(user.id, `${period}d`, 'day').catch(err => {
          console.error('Error loading revenue chart:', err);
          return [];
        }),
        getCustomerAnalytics(user.id, period).catch(err => {
          console.error('Error loading customer analytics:', err);
          return null;
        })
      ]);
      
      setAnalyticsOverview(overview);
      setTopProducts(products);
      setRevenueChartData(chartData);
      setCustomerAnalytics(customers);
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setNotification({ 
        message: 'Lỗi khi tải dữ liệu phân tích', 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Load analytics data when switching to analytics tab
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalyticsData();
    }
  }, [activeTab, analyticsPeriod]);

  // Handle analytics period change
  const handleAnalyticsPeriodChange = (newPeriod: number) => {
    setAnalyticsPeriod(newPeriod);
    if (activeTab === 'analytics') {
      loadAnalyticsData(newPeriod);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <div className="flex items-center">
            <span className="mr-2">
              {notification.type === 'success' ? '✅' : '❌'}
            </span>
            {notification.message}
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Seller</h1>
        <p className="text-gray-600">Chào mừng trở lại, {user?.displayName || 'Seller'}!</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        <TabButton 
          label="Tổng quan" 
          active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')} 
        />
        <TabButton 
          label="Sản phẩm" 
          active={activeTab === 'products'} 
          onClick={() => setActiveTab('products')} 
        />
        <TabButton 
          label="Đơn hàng" 
          active={activeTab === 'orders'} 
          onClick={() => setActiveTab('orders')} 
        />
        <TabButton 
          label="Hoàn tiền" 
          active={activeTab === 'refunds'} 
          onClick={() => setActiveTab('refunds')}
          badge={stats.pendingRefunds}
        />
        <TabButton 
          label="Phân tích" 
          active={activeTab === 'analytics'} 
          onClick={() => setActiveTab('analytics')} 
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <StatCard
              title="Tổng sản phẩm"
              value={stats.totalProducts}
              icon="📦"
              color="bg-blue-100"
            />
            <StatCard
              title="Tổng đơn hàng"
              value={stats.totalOrders}
              icon="🛒"
              color="bg-green-100"
            />
            <StatCard
              title="Doanh thu"
              value={formatCurrency(stats.totalRevenue)}
              icon="💰"
              color="bg-yellow-100"
            />
            <StatCard
              title="Cần gửi hàng"
              value={stats.pendingOrders}
              icon="📦"
              color="bg-orange-100"
            />
            <StatCard
              title="Đã gửi hàng"
              value={stats.completedOrders}
              icon="✅"
              color="bg-green-100"
            />
            <StatCard
              title="Yêu cầu hoàn tiền"
              value={stats.pendingRefunds}
              icon="🔄"
              color="bg-red-100"
            />
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sản phẩm gần đây</h3>
              </div>
              <div className="p-6">
                {recentProducts.length > 0 ? (
                  <div className="space-y-4">
                    {recentProducts.map((product, index) => (
                      <div key={product.id || index} className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500">📦</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(0)}</p>
                          <p className="text-sm text-gray-500">Kho: N/A</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Chưa có sản phẩm nào</p>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Đơn hàng gần đây</h3>
              </div>
              <div className="p-6">
                {recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order, index) => (
                      <div key={order.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">#{order.id || 'N/A'}</h4>
                            <p className="text-sm text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || '')}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">{order.items?.length || 0} sản phẩm</p>
                          <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Chưa có đơn hàng nào</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Thao tác nhanh</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('products')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📦</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Quản lý sản phẩm</h4>
                      <p className="text-sm text-gray-500">Thêm, sửa, xóa sản phẩm</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('orders')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🛒</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Xử lý đơn hàng</h4>
                      <p className="text-sm text-gray-500">Quản lý và gửi hàng</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('refunds')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left relative"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🔄</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Yêu cầu hoàn tiền</h4>
                      <p className="text-sm text-gray-500">Xử lý hoàn tiền từ buyers</p>
                    </div>
                  </div>
                  {stats.pendingRefunds > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {stats.pendingRefunds}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Quản lý sản phẩm</h3>
            <button 
              onClick={() => setIsAddProductModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Thêm sản phẩm
            </button>
          </div>
          <div className="p-6">
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Đang tải sản phẩm...</p>
              </div>
            ) : allProducts.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sản phẩm
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Giá
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kho
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allProducts.map((product, index) => (
                        <React.Fragment key={product.id || index}>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleProductExpand(product.id || '')}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {expandedProducts.has(product.id || '') ? '▼' : '▶'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                                  <span className="text-gray-500">📦</span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.slug || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(product.basePrice || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              NA
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                product.active === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {product.active || 'INACTIVE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button 
                                  onClick={() => handleEditProduct(product)}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={deletingProductId === product.id}
                                >
                                  Sửa
                                </button>
                                <button 
                                  onClick={() => handleManageImages(product.id || '')}
                                  className="text-purple-600 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={deletingProductId === product.id}
                                >
                                  Hình ảnh
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(product.id || '', product.name || '')}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={deletingProductId === product.id}
                                >
                                  {deletingProductId === product.id ? 'Đang xóa...' : 'Xóa'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Product Variants Row */}
                          {expandedProducts.has(product.id || '') && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                <div className="pl-8">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-medium text-gray-900">Biến thể sản phẩm</h4>
                                    <button
                                      onClick={() => handleAddVariant(product.id || '')}
                                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                                    >
                                      + Thêm biến thể
                                    </button>
                                  </div>
                                  
                                  {variantsLoading[product.id || ''] ? (
                                    <div className="text-center py-4">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                      <p className="text-gray-500 mt-2">Đang tải biến thể...</p>
                                    </div>
                                  ) : productVariants[product.id || '']?.length > 0 ? (
                                    <div className="space-y-2">
                                      {productVariants[product.id || ''].map((variant) => (
                                        <div key={variant.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-4">
                                              <div>
                                                <p className="text-sm font-medium text-gray-900">SKU: {variant.sku}</p>
                                                <p className="text-sm text-gray-500">
                                                  Giá: {formatCurrency(variant.price || 0)}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-gray-500">
                                                  Tồn kho: {variant.availableQty || 0}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                  Đã bán: {variant.soldQty || 0}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-gray-500">Thuộc tính:</p>
                                                <p className="text-sm text-gray-700">
                                                  {variant.attributes ? 
                                                    Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(', ') 
                                                    : 'N/A'
                                                  }
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={() => handleEditVariant(variant, product.id || '')}
                                              className="text-blue-600 hover:text-blue-900 text-sm"
                                            >
                                              Sửa
                                            </button>
                                            <button
                                              onClick={() => handleDeleteVariant(variant.id || '', variant.sku || '', product.id || '')}
                                              className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
                                              disabled={deletingVariantId === variant.id}
                                            >
                                              {deletingVariantId === variant.id ? 'Đang xóa...' : 'Xóa'}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-center py-4">Chưa có biến thể nào</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {productsPagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Hiển thị {productsPagination.currentPage * 10 + 1} - {Math.min((productsPagination.currentPage + 1) * 10, productsPagination.totalElements)} trong tổng số {productsPagination.totalElements} sản phẩm
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchSellerProducts(productsPagination.currentPage - 1)}
                        disabled={productsPagination.currentPage === 0}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Trước
                      </button>
                      <span className="px-3 py-1 text-sm">
                        {productsPagination.currentPage + 1} / {productsPagination.totalPages}
                      </span>
                      <button
                        onClick={() => fetchSellerProducts(productsPagination.currentPage + 1)}
                        disabled={productsPagination.currentPage >= productsPagination.totalPages - 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có sản phẩm nào</h3>
                <p className="text-gray-500 mb-4">Bắt đầu bằng cách thêm sản phẩm đầu tiên của bạn</p>
                <button 
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Thêm sản phẩm
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Quản lý đơn hàng</h3>
              <div className="flex items-center space-x-4">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả đơn hàng</option>
                  <option value="PAID">PAID - Đã thanh toán, cần gửi hàng</option>
                  <option value="DELIVERED">DELIVERED - Đã gửi hàng</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            {ordersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Đang tải đơn hàng...</p>
              </div>
            ) : allOrders.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mã đơn hàng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Khách hàng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tổng tiền
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thanh toán
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày tạo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allOrders.map((order, index) => (
                        <tr key={order.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              #{order.id?.slice(-8) || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.buyerId?.slice(-8) || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(order.totalAmount || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status || '')}`}>
                              {order.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.paymentStatus || '')}`}>
                              {order.paymentStatus || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => handleViewOrderDetails(order)}
                                className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded"
                              >
                                Chi tiết
                              </button>
                              {order.status === 'PAID' && (
                                <button 
                                  onClick={() => handleUploadProof(order)}
                                  className="text-green-600 hover:text-green-900 px-2 py-1 rounded"
                                >
                                  Upload bằng chứng
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {ordersPagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Hiển thị {ordersPagination.currentPage * 10 + 1} - {Math.min((ordersPagination.currentPage + 1) * 10, ordersPagination.totalElements)} trong tổng số {ordersPagination.totalElements} đơn hàng
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOrdersPagination(ordersPagination.currentPage - 1)}
                        disabled={ordersPagination.currentPage === 0}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Trước
                      </button>
                      <span className="px-3 py-1 text-sm">
                        {ordersPagination.currentPage + 1} / {ordersPagination.totalPages}
                      </span>
                      <button
                        onClick={() => handleOrdersPagination(ordersPagination.currentPage + 1)}
                        disabled={ordersPagination.currentPage >= ordersPagination.totalPages - 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
                <p className="text-gray-500">Đơn hàng đã thanh toán sẽ xuất hiện ở đây để bạn xử lý gửi hàng</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'refunds' && (
        <SellerRefundManagement />
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Header with Time Filter */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Phân tích & Báo cáo</h2>
              <div className="flex items-center space-x-4">
                <select 
                  value={analyticsPeriod}
                  onChange={(e) => handleAnalyticsPeriodChange(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={analyticsLoading}
                >
                  <option value={7}>7 ngày qua</option>
                  <option value={30}>30 ngày qua</option>
                  <option value={90}>3 tháng qua</option>
                  <option value={365}>1 năm qua</option>
                </select>
                <button 
                  onClick={() => loadAnalyticsData()}
                  disabled={analyticsLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyticsLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải dữ liệu phân tích...</p>
            </div>
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 mr-4">
                      <span className="text-2xl">💰</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Doanh thu {analyticsPeriod} ngày</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(analyticsOverview?.totalRevenue || 0)}
                      </p>
                      <p className="text-sm text-green-600">
                        {analyticsOverview?.monthlyGrowth?.revenue ? 
                          `${analyticsOverview.monthlyGrowth.revenue > 0 ? '+' : ''}${analyticsOverview.monthlyGrowth.revenue.toFixed(1)}% so với kỳ trước` 
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 mr-4">
                      <span className="text-2xl">📦</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Đơn hàng mới</p>
                      <p className="text-2xl font-bold text-gray-900">{analyticsOverview?.totalOrders || 0}</p>
                      <p className="text-sm text-blue-600">
                        {analyticsOverview?.monthlyGrowth?.orders ? 
                          `${analyticsOverview.monthlyGrowth.orders > 0 ? '+' : ''}${analyticsOverview.monthlyGrowth.orders.toFixed(1)}% so với kỳ trước` 
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100 mr-4">
                      <span className="text-2xl">📈</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Giá trị đơn TB</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(analyticsOverview?.averageOrderValue || 0)}
                      </p>
                      <p className="text-sm text-yellow-600">
                        {analyticsOverview?.monthlyGrowth?.avgOrderValue ? 
                          `${analyticsOverview.monthlyGrowth.avgOrderValue > 0 ? '+' : ''}${analyticsOverview.monthlyGrowth.avgOrderValue.toFixed(1)}% so với kỳ trước` 
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 mr-4">
                      <span className="text-2xl">⭐</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Đánh giá TB</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsOverview?.averageRating ? `${analyticsOverview.averageRating.toFixed(1)}/5` : 'N/A'}
                      </p>
                      <p className="text-sm text-purple-600">
                        Tỷ lệ giao hàng: {analyticsOverview?.deliverySuccessRate ? `${analyticsOverview.deliverySuccessRate.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart - Completely Rebuilt */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Doanh thu theo thời gian</h3>
                    <div className="text-sm text-gray-500">
                      {revenueChartData.length > 0 && (
                        <span>Tổng: {formatCurrency(revenueChartData.reduce((sum, data) => sum + (data.revenue || 0), 0))}</span>
                      )}
                    </div>
                  </div>
                  
                  {revenueChartData.length > 0 ? (
                    <div className="space-y-4">
                      {/* Chart Container */}
                      <div className="relative bg-gray-50 p-4 rounded-lg">
                        {/* Calculate max value for scaling */}
                        {(() => {
                          const maxRevenue = Math.max(...revenueChartData.map(d => d.revenue || 0));
                          const chartHeight = 200;
                          
                          return (
                            <div className="relative" style={{ height: `${chartHeight + 40}px` }}>
                              {/* Y-axis Scale */}
                              <div className="absolute left-0 top-0 h-full w-16 flex flex-col justify-between text-xs text-gray-600">
                                <div className="text-right pr-2">{formatCurrency(maxRevenue, true)}</div>
                                <div className="text-right pr-2">{formatCurrency(maxRevenue * 0.75, true)}</div>
                                <div className="text-right pr-2">{formatCurrency(maxRevenue * 0.5, true)}</div>
                                <div className="text-right pr-2">{formatCurrency(maxRevenue * 0.25, true)}</div>
                                <div className="text-right pr-2">0</div>
                              </div>
                              
                              {/* Grid Lines */}
                              <div className="absolute left-16 top-0 right-0" style={{ height: `${chartHeight}px` }}>
                                {[0, 25, 50, 75, 100].map((percent) => (
                                  <div 
                                    key={percent}
                                    className="absolute w-full border-t border-gray-300 border-dashed"
                                    style={{ top: `${percent}%` }}
                                  />
                                ))}
                              </div>
                              
                              {/* Chart Bars */}
                              <div className="absolute left-16 top-0 right-0 flex items-end justify-between px-2" style={{ height: `${chartHeight}px` }}>
                                {revenueChartData.map((data, index) => {
                                  const revenue = data.revenue || 0;
                                  const barHeight = maxRevenue > 0 ? (revenue / maxRevenue) * chartHeight : 0;
                                  const isHighest = revenue === maxRevenue;
                                  
                                  return (
                                    <div key={index} className="flex flex-col items-center group relative" style={{ width: `${80 / revenueChartData.length}%` }}>
                                      {/* Tooltip */}
                                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                        <div className="text-center">
                                          <div>{data.period}</div>
                                          <div className="font-bold">{formatCurrency(revenue)}</div>
                                        </div>
                                      </div>
                                      
                                      {/* Bar */}
                                      <div 
                                        className={`w-full rounded-t transition-all duration-300 group-hover:shadow-lg ${
                                          isHighest 
                                            ? 'bg-gradient-to-t from-blue-700 to-blue-500' 
                                            : 'bg-gradient-to-t from-blue-600 to-blue-400'
                                        }`}
                                        style={{ 
                                          height: `${barHeight}px`,
                                          minHeight: revenue > 0 ? '8px' : '2px'
                                        }}
                                      />
                                      
                                      {/* Value on top of bar */}
                                      {barHeight > 30 && (
                                        <div className="absolute -top-6 text-xs font-medium text-gray-700">
                                          {formatCurrency(revenue, true)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* X-axis Labels */}
                              <div className="absolute left-16 right-0 flex justify-between px-2" style={{ top: `${chartHeight + 10}px` }}>
                                {revenueChartData.map((data, index) => (
                                  <div key={index} className="text-xs text-gray-600 text-center" style={{ width: `${80 / revenueChartData.length}%` }}>
                                    {data.period ? (
                                      analyticsPeriod === 7 ? data.period.slice(-5) :
                                      analyticsPeriod === 30 ? data.period.slice(-2) :
                                      data.period.slice(-7)
                                    ) : `Ngày ${index + 1}`}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Summary Statistics */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <div className="text-xs font-medium text-green-700 mb-1">Cao nhất</div>
                          <div className="text-sm font-bold text-green-600">
                            {formatCurrency(Math.max(...revenueChartData.map(d => d.revenue || 0)))}
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <div className="text-xs font-medium text-blue-700 mb-1">Trung bình</div>
                          <div className="text-sm font-bold text-blue-600">
                            {formatCurrency(revenueChartData.reduce((sum, data) => sum + (data.revenue || 0), 0) / revenueChartData.length)}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                          <div className="text-xs font-medium text-orange-700 mb-1">Thấp nhất</div>
                          <div className="text-sm font-bold text-orange-600">
                            {formatCurrency(Math.min(...revenueChartData.map(d => d.revenue || 0)))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-600 mb-2">Chưa có dữ liệu doanh thu</h4>
                      <p className="text-gray-500 text-center text-sm">
                        Biểu đồ sẽ hiển thị khi có doanh thu trong<br />
                        <span className="font-medium">{analyticsPeriod} ngày qua</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Status Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Phân bố trạng thái đơn hàng</h3>
                    <div className="text-sm text-gray-500">
                      Tổng: {analyticsOverview?.totalOrders || 0} đơn
                    </div>
                  </div>
                  
                  {analyticsOverview && (analyticsOverview.totalOrders || 0) > 0 ? (
                    <div className="space-y-6">
                      {/* Pie Chart Simulation */}
                      <div className="flex justify-center">
                        <div className="relative w-40 h-40">
                          {/* Pie Chart using conic-gradient */}
                          <div 
                            className="w-full h-full rounded-full"
                            style={{
                              background: `conic-gradient(
                                #10B981 0deg ${((analyticsOverview.completedOrders || 0) / (analyticsOverview.totalOrders || 1)) * 360}deg,
                                #F59E0B ${((analyticsOverview.completedOrders || 0) / (analyticsOverview.totalOrders || 1)) * 360}deg ${(((analyticsOverview.completedOrders || 0) + (analyticsOverview.pendingOrders || 0)) / (analyticsOverview.totalOrders || 1)) * 360}deg,
                                #EF4444 ${(((analyticsOverview.completedOrders || 0) + (analyticsOverview.pendingOrders || 0)) / (analyticsOverview.totalOrders || 1)) * 360}deg 360deg
                              )`
                            }}
                          ></div>
                          
                          {/* Center hole */}
                          <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-gray-900">{analyticsOverview.totalOrders || 0}</span>
                            <span className="text-xs text-gray-500">Tổng đơn</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Details */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">Hoàn thành</span>
                              <div className="text-xs text-gray-500">
                                {(analyticsOverview.totalOrders || 0) > 0 ? 
                                  `${Math.round(((analyticsOverview.completedOrders || 0) / (analyticsOverview.totalOrders || 1)) * 100)}%` : '0%'
                                } của tổng đơn hàng
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">{analyticsOverview.completedOrders || 0}</div>
                            <div className="text-xs text-green-500">đơn hàng</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">Đang xử lý</span>
                              <div className="text-xs text-gray-500">
                                {(analyticsOverview.totalOrders || 0) > 0 ? 
                                  `${Math.round(((analyticsOverview.pendingOrders || 0) / (analyticsOverview.totalOrders || 1)) * 100)}%` : '0%'
                                } của tổng đơn hàng
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-600">{analyticsOverview.pendingOrders || 0}</div>
                            <div className="text-xs text-orange-500">đơn hàng</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">Đã hủy</span>
                              <div className="text-xs text-gray-500">
                                {(analyticsOverview.totalOrders || 0) > 0 ? 
                                  `${Math.round(((analyticsOverview.cancelledOrders || 0) / (analyticsOverview.totalOrders || 1)) * 100)}%` : '0%'
                                } của tổng đơn hàng
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-red-600">{analyticsOverview.cancelledOrders || 0}</div>
                            <div className="text-xs text-red-500">đơn hàng</div>
                          </div>
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Tỷ lệ thành công</span>
                          <span className="text-lg font-bold text-green-600">
                            {(analyticsOverview.totalOrders || 0) > 0 ? 
                              `${Math.round(((analyticsOverview.completedOrders || 0) / (analyticsOverview.totalOrders || 1)) * 100)}%` : '0%'
                            }
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(analyticsOverview.totalOrders || 0) > 0 ? 
                                ((analyticsOverview.completedOrders || 0) / (analyticsOverview.totalOrders || 1)) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-center">
                        Chưa có đơn hàng nào<br />
                        <span className="text-sm">trong {analyticsPeriod} ngày qua</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sản phẩm bán chạy</h3>
                  <div className="space-y-4">
                    {topProducts.length > 0 ? (
                      topProducts.map((product, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                            <p className="text-xs text-gray-500">
                              {product.totalSales} đơn • {formatCurrency(product.totalRevenue || 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              #{product.rank || index + 1}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">Chưa có dữ liệu sản phẩm</p>
                    )}
                  </div>
                </div>

                {/* Customer Insights */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin khách hàng</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tổng khách hàng</span>
                      <span className="text-sm font-medium text-gray-900">{customerAnalytics?.totalCustomers || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Khách hàng mới</span>
                      <span className="text-sm font-medium text-gray-900">{customerAnalytics?.newCustomers || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Khách hàng quay lại</span>
                      <span className="text-sm font-medium text-gray-900">
                        {customerAnalytics?.totalCustomers ? 
                          `${Math.round(((customerAnalytics.returningCustomers || 0) / customerAnalytics.totalCustomers) * 100)}%` 
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Đơn hàng/khách TB</span>
                      <span className="text-sm font-medium text-gray-900">
                        {customerAnalytics?.averageOrdersPerCustomer?.toFixed(1) || '0'}
                      </span>
                    </div>
                    {customerAnalytics?.vipCustomers && customerAnalytics.vipCustomers.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Khách hàng VIP</h4>
                        <div className="space-y-2">
                          {customerAnalytics.vipCustomers.map((customer, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">{customer.customerName || 'N/A'}</span>
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                {formatCurrency(customer.totalSpent || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiệu suất hoạt động</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Tỷ lệ giao hàng thành công</span>
                        <span className="text-sm font-medium text-gray-900">
                          {analyticsOverview?.deliverySuccessRate?.toFixed(1) || '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${analyticsOverview?.deliverySuccessRate || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Thời gian xử lý TB</span>
                        <span className="text-sm font-medium text-gray-900">
                          {analyticsOverview?.averageProcessingTime?.toFixed(1) || '0'}h
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min((analyticsOverview?.averageProcessingTime || 0) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Tỷ lệ phản hồi</span>
                        <span className="text-sm font-medium text-gray-900">
                          {analyticsOverview?.responseRate?.toFixed(1) || '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${analyticsOverview?.responseRate || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Tóm tắt {analyticsPeriod} ngày</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600">Tổng doanh thu</span>
                          <span className="text-xs font-medium">{formatCurrency(analyticsOverview?.totalRevenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600">Tổng đơn hàng</span>
                          <span className="text-xs font-medium">{analyticsOverview?.totalOrders || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600">Khách hàng mới</span>
                          <span className="text-xs font-medium">{customerAnalytics?.newCustomers || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Xác nhận xóa sản phẩm</h3>
                <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Bạn có chắc chắn muốn xóa sản phẩm <strong>"{showDeleteConfirm.productName}"</strong>?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={deletingProductId === showDeleteConfirm.productId}
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deletingProductId === showDeleteConfirm.productId}
              >
                {deletingProductId === showDeleteConfirm.productId ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSuccess={handleAddProductSuccess}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditProductModalOpen}
        onClose={() => {
          setIsEditProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={handleEditProductSuccess}
        product={editingProduct}
      />

      {/* Edit Variant Modal */}
      <EditVariantModal
        isOpen={isEditVariantModalOpen}
        onClose={() => {
          setIsEditVariantModalOpen(false);
          setEditingVariant(null);
        }}
        onSuccess={handleEditVariantSuccess}
        variant={editingVariant?.variant || null}
        productId={editingVariant?.productId || ''}
      />

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={() => {
          setIsOrderDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />

      {/* Upload Proof Modal */}
      <UploadProofModal
        isOpen={isUploadProofModalOpen}
        onClose={() => {
          setIsUploadProofModalOpen(false);
          setSelectedOrder(null);
        }}
        onSuccess={handleUploadProofSuccess}
        order={selectedOrder}
        sellerId={user?.id || ''}
      />

      {/* Add Variant Modal */}
      <AddVariantModal
        isOpen={isAddVariantModalOpen}
        onClose={() => {
          setIsAddVariantModalOpen(false);
          setAddingVariantProductId(null);
        }}
        productId={addingVariantProductId || ''}
        productName={allProducts.find((p: ProductDto) => p.id === addingVariantProductId)?.name || ''}
        loading={creatingVariant}
        onSubmit={handleCreateVariant}
      />

      {/* Image Manager Modal */}
      <ImageManagerModal
        isOpen={isImageManagerOpen}
        onClose={() => {
          setIsImageManagerOpen(false);
          setManagingImagesProductId(null);
        }}
        productName={allProducts.find((p: ProductDto) => p.id === managingImagesProductId)?.name || ''}
        images={productImages[managingImagesProductId || ''] || []}
        loading={imagesLoading[managingImagesProductId || ''] || false}
        uploading={uploadingImages[managingImagesProductId || ''] || false}
        onUpload={(files) => handleUploadImages(managingImagesProductId || '', files)}
        onDelete={(imageId) => handleDeleteImage(managingImagesProductId || '', imageId)}
        deletingImageId={deletingImageId}
      />
    </div>
  );
};

export default SellerDashboard;