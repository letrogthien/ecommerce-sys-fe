import type { components } from '../api-types/transactionService';
import apiClient from './apiClientTransaction';

type OrderCreateRq = components['schemas']['OrderCreateRq'];
type OrderDto = components['schemas']['OrderDto'];
type ApiResponseOrderDto = components['schemas']['ApiResponseOrderDto'];
type ApiResponsePageOrderDto = components['schemas']['ApiResponsePageOrderDto'];

// Refund Types
type OrderRefundDto = components['schemas']['OrderRefundDto'];
type OrderRefundCreateRq = components['schemas']['OrderRefundCreateRq'];
type ApiResponseOrderRefundDto = components['schemas']['ApiResponseOrderRefundDto'];
type ApiResponsePageOrderRefundDto = components['schemas']['ApiResponsePageOrderRefundDto'];

// Dispute Types
type OrderDisputeDto = components['schemas']['OrderDisputeDto'];
type OrderDisputeCreateRq = components['schemas']['OrderDisputeCreateRq'];
type OrderDisputeUpdateRq = components['schemas']['OrderDisputeUpdateRq'];
type ApiResponseOrderDisputeDto = components['schemas']['ApiResponseOrderDisputeDto'];
type ApiResponsePageOrderDisputeDto = components['schemas']['ApiResponsePageOrderDisputeDto'];

// Analytics Types
type AnalyticsOverviewDTO = components['schemas']['AnalyticsOverviewDTO'];
type ApiResponseAnalyticsOverviewDTO = components['schemas']['ApiResponseAnalyticsOverviewDTO'];
type TopProductDTO = components['schemas']['TopProductDTO'];
type ApiResponseListTopProductDTO = components['schemas']['ApiResponseListTopProductDTO'];
type RevenueChartDataDTO = components['schemas']['RevenueChartDataDTO'];
type ApiResponseListRevenueChartDataDTO = components['schemas']['ApiResponseListRevenueChartDataDTO'];
type CustomerAnalyticsDTO = components['schemas']['CustomerAnalyticsDTO'];
type ApiResponseCustomerAnalyticsDTO = components['schemas']['ApiResponseCustomerAnalyticsDTO'];
type ApiResponseObject = components['schemas']['ApiResponseObject'];

/**
 * Create a new order
 */
export const createOrder = async ( orderData: OrderCreateRq): Promise<OrderDto> => {
    const response = await apiClient.post<ApiResponseOrderDto>(
        `/api/v1/transaction-service/orders`,
        orderData
    );
    
    if (!response.data.data) {
        throw new Error('Failed to create order - no data returned');
    }
    
    return response.data.data;
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId: string, userId: string): Promise<OrderDto> => {
    const params = new URLSearchParams({ userId });
    
    const response = await apiClient.get<ApiResponseOrderDto>(
        `/api/v1/transaction-service/orders/${orderId}?${params.toString()}`
    );
    
    if (!response.data.data) {
        throw new Error('Order not found');
    }
    
    return response.data.data;
};

/**
 * Get orders by buyer with pagination support
 */
export const getOrdersByBuyer = async (buyerId: string, options?: {
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{
    orders: OrderDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams({
        buyerId,
        ...(options?.status && { status: options.status }),
        ...(options?.page !== undefined && { page: options.page.toString() }),
        ...(options?.limit !== undefined && { limit: options.limit.toString() })
    });

    const response = await apiClient.get<ApiResponsePageOrderDto>(
        `/api/v1/transaction-service/orders/buyer?${params.toString()}`
    );
    
    // Handle paginated response structure - extract content array from PageOrderDto
    const pageData = response.data?.data;
    const orders = pageData?.content || [];
    
    return {
        orders: Array.isArray(orders) ? orders : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

/**
 * Get orders by seller with pagination support
 */
export const getOrdersBySeller = async (sellerId: string, options?: {
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{
    orders: OrderDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams({
        sellerId,
        ...(options?.status && { status: options.status }),
        ...(options?.page !== undefined && { page: options.page.toString() }),
        ...(options?.limit !== undefined && { limit: options.limit.toString() })
    });

    const response = await apiClient.get<ApiResponsePageOrderDto>(
        `/api/v1/transaction-service/orders/seller?${params.toString()}`
    );
    
    // Handle paginated response structure - extract content array from PageOrderDto
    const pageData = response.data?.data;
    const orders = pageData?.content || [];
    
    return {
        orders: Array.isArray(orders) ? orders : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

/**
 * Upload delivery proof for an order
 */
export const uploadDeliveryProof = async (
  orderId: string,
  sellerId: string,
  proofData: {
    type: "SCREENSHOT" | "VIDEO" | "TEXT_NOTE" | "DELIVERY" | "PURCHASE";
    url: string;
    note?: string;
  },
  file: File
): Promise<OrderDto> => {
  const formData = new FormData();

  formData.append(
    "proofData",
    new Blob(
      [
        JSON.stringify({
          orderId,
          sellerId,
          type: proofData.type,
          url: proofData.url,
          note: proofData.note || "",
        }),
      ],
      { type: "application/json" }
    )
  );

  formData.append("file", file);

  const response = await apiClient.post<ApiResponseOrderDto>(
    `/api/v1/transaction-service/orders/${orderId}/proof`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if (!response.data.data) {
    throw new Error("Failed to upload delivery proof");
  }

  return response.data.data;
};


/**
 * Cancel an order
 */
export const cancelOrder = async (orderId: string, buyerId: string): Promise<OrderDto> => {
    const params = new URLSearchParams({ buyerId });
    
    const response = await apiClient.put<ApiResponseOrderDto>(
        `/api/v1/transaction-service/orders/${orderId}/cancel?${params.toString()}`
    );
    
    if (!response.data.data) {
        throw new Error('Failed to cancel order');
    }
    
    return response.data.data;
};

// ========== ANALYTICS ENDPOINTS ==========

/**
 * Get analytics overview for seller
 */
export const getAnalyticsOverview = async (sellerId: string, period?: number): Promise<AnalyticsOverviewDTO> => {
    const params = new URLSearchParams();
    if (period) {
        params.append('period', period.toString());
    }
    
    const baseUrl = `/api/v1/transaction-service/analytics/seller/${sellerId}/overview`;
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    const response = await apiClient.get<ApiResponseAnalyticsOverviewDTO>(url);
    
    if (!response.data.data) {
        throw new Error('Failed to get analytics overview');
    }
    
    return response.data.data;
};

/**
 * Get top products for seller
 */
export const getTopProducts = async (sellerId: string, period?: number, limit?: number): Promise<TopProductDTO[]> => {
    const params = new URLSearchParams();
    if (period) {
        params.append('period', period.toString());
    }
    if (limit) {
        params.append('limit', limit.toString());
    }
    
    const baseUrl = `/api/v1/transaction-service/analytics/seller/${sellerId}/top-products`;
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    const response = await apiClient.get<ApiResponseListTopProductDTO>(url);
    
    return response.data.data || [];
};

/**
 * Get revenue chart data for seller
 */
export const getRevenueChartData = async (
    sellerId: string, 
    period?: string, 
    groupBy?: string
): Promise<RevenueChartDataDTO[]> => {
    const params = new URLSearchParams();
    if (period) {
        params.append('period', period);
    }
    if (groupBy) {
        params.append('groupBy', groupBy);
    }
    
    const baseUrl = `/api/v1/transaction-service/analytics/seller/${sellerId}/revenue-chart`;
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    const response = await apiClient.get<ApiResponseListRevenueChartDataDTO>(url);
    
    return response.data.data || [];
};

/**
 * Get customer analytics for seller
 */
export const getCustomerAnalytics = async (sellerId: string, period?: number): Promise<CustomerAnalyticsDTO> => {
    const params = new URLSearchParams();
    if (period) {
        params.append('period', period.toString());
    }
    
    const baseUrl = `/api/v1/transaction-service/analytics/seller/${sellerId}/customers`;
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    const response = await apiClient.get<ApiResponseCustomerAnalyticsDTO>(url);
    
    if (!response.data.data) {
        throw new Error('Failed to get customer analytics');
    }
    
    return response.data.data;
};

// ========== REFUND ENDPOINTS ==========

/**
 * Get refunds by buyer with pagination support
 */
export const getRefundsByBuyer = async (options?: {
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{
    refunds: OrderRefundDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams({
        ...(options?.status && { status: options.status }),
        ...(options?.page !== undefined && { page: options.page.toString() }),
        ...(options?.limit !== undefined && { limit: options.limit.toString() })
    });

    const response = await apiClient.get<ApiResponsePageOrderRefundDto>(
        `/api/v1/transaction-service/refunds/buyer?${params.toString()}`
    );
    
    // Handle paginated response structure
    const pageData = response.data?.data;
    const refunds = pageData?.content || [];
    
    return {
        refunds: Array.isArray(refunds) ? refunds : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

/**
 * Create a new refund request
 */
export const createRefundRequest = async (refundData: OrderRefundCreateRq): Promise<OrderRefundDto> => {
    const response = await apiClient.post<ApiResponseOrderRefundDto>(
        `/api/v1/transaction-service/refunds`,
        refundData
    );
    
    if (!response.data.data) {
        throw new Error('Failed to create refund request - no data returned');
    }
    
    return response.data.data;
};

/**
 * Get refund status for a specific order
 */
export const getRefundByOrderId = async (orderId: string): Promise<OrderRefundDto> => {
    const response = await apiClient.get<ApiResponseOrderRefundDto>(
        `/api/v1/transaction-service/refunds/order/${orderId}`
    );
    
    if (!response.data.data) {
        throw new Error('Refund not found for this order');
    }
    
    return response.data.data;
};

/**
 * Get all refunds with admin permissions (for admin users)
 */
export const getAllRefundsAdmin = async (options?: {
    status?: string;
    orderId?: string;
    buyerId?: string;
    page?: number;
    limit?: number;
}): Promise<{
    refunds: OrderRefundDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams();
    
    if (options?.status) params.append('status', options.status);
    if (options?.orderId) params.append('orderId', options.orderId);
    if (options?.buyerId) params.append('buyerId', options.buyerId);
    if (options?.page !== undefined) params.append('page', options.page.toString());
    if (options?.limit !== undefined) params.append('limit', options.limit.toString());

    const response = await apiClient.get<ApiResponsePageOrderRefundDto>(
        `/api/v1/transaction-service/admin/refunds?${params.toString()}`
    );
    
    // Handle paginated response structure
    const pageData = response.data?.data;
    const refunds = pageData?.content || [];
    
    return {
        refunds: Array.isArray(refunds) ? refunds : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

// ========== SELLER REFUND MANAGEMENT ==========

/**
 * Get refunds by seller with pagination support
 */
export const getRefundsBySeller = async (sellerId: string, options?: {
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{
    refunds: OrderRefundDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams({
        ...(options?.status && { status: options.status }),
        ...(options?.page !== undefined && { page: options.page.toString() }),
        ...(options?.limit !== undefined && { limit: options.limit.toString() })
    });

    const response = await apiClient.get<ApiResponsePageOrderRefundDto>(
        `/api/v1/transaction-service/refunds/seller/${sellerId}?${params.toString()}`
    );
    
    const pageData = response.data?.data;
    const refunds = pageData?.content || [];
    
    return {
        refunds: Array.isArray(refunds) ? refunds : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

/**
 * Approve a refund request by seller
 */
export const approveRefund = async (refundId: string, sellerId: string, note?: string): Promise<OrderRefundDto> => {
    const response = await apiClient.put<ApiResponseOrderRefundDto>(
        `/api/v1/transaction-service/refunds/seller/${refundId}/approve`,
        { sellerId, note }
    );
    
    if (!response.data.data) {
        throw new Error('Failed to approve refund - no data returned');
    }
    
    return response.data.data;
};

/**
 * Reject a refund request by seller
 */
export const rejectRefund = async (refundId: string, sellerId: string, reason: string): Promise<OrderRefundDto> => {
    const response = await apiClient.put<ApiResponseOrderRefundDto>(
        `/api/v1/transaction-service/refunds/${refundId}/reject`,
        { sellerId, reason }
    );
    
    if (!response.data.data) {
        throw new Error('Failed to reject refund - no data returned');
    }
    
    return response.data.data;
};

/**
 * Update refund status
 */
export const updateRefundStatus = async (
    refundId: string, 
    status: string, 
    updatedBy: string,
    note?: string
): Promise<OrderRefundDto> => {
    const response = await apiClient.put<ApiResponseOrderRefundDto>(
        `/api/v1/transaction-service/refunds/${refundId}/status`,
        { status, updatedBy, note }
    );
    
    if (!response.data.data) {
        throw new Error('Failed to update refund status - no data returned');
    }
    
    return response.data.data;
};

// ========== ADMIN REFUND MANAGEMENT ==========

/**
 * Admin approve refund
 */
export const adminApproveRefund = async (refundId: string, note?: string): Promise<OrderRefundDto> => {
    const params = new URLSearchParams();
    if (note) {
        params.append('note', note);
    }
    
    const url = params.toString() 
        ? `/api/v1/transaction-service/admin/refunds/${refundId}/approve?${params.toString()}`
        : `/api/v1/transaction-service/admin/refunds/${refundId}/approve`;

    const response = await apiClient.put<ApiResponseOrderRefundDto>(url);
    
    if (!response.data.data) {
        throw new Error('Failed to approve refund - no data returned');
    }
    
    return response.data.data;
};

/**
 * Admin reject refund
 */
export const adminRejectRefund = async (refundId: string, reason: string): Promise<OrderRefundDto> => {
    const params = new URLSearchParams({ reason });
    
    const response = await apiClient.put<ApiResponseOrderRefundDto>(
        `/api/v1/transaction-service/admin/refunds/${refundId}/reject?${params.toString()}`
    );
    
    if (!response.data.data) {
        throw new Error('Failed to reject refund - no data returned');
    }
    
    return response.data.data;
};

/**
 * Admin force complete refund
 */
export const adminForceCompleteRefund = async (refundId: string, note?: string): Promise<OrderRefundDto> => {
    const params = new URLSearchParams();
    if (note) {
        params.append('note', note);
    }
    
    const url = params.toString() 
        ? `/api/v1/transaction-service/admin/refunds/${refundId}/force-complete?${params.toString()}`
        : `/api/v1/transaction-service/admin/refunds/${refundId}/force-complete`;

    const response = await apiClient.put<ApiResponseOrderRefundDto>(url);
    
    if (!response.data.data) {
        throw new Error('Failed to force complete refund - no data returned');
    }
    
    return response.data.data;
};

/**
 * Process refund payment (Admin only)
 */
export const processRefundPayment = async (
    refundId: string, 
    adminId: string, 
    paymentMethod: string, 
    note?: string
): Promise<OrderRefundDto> => {
    const response = await apiClient.post<ApiResponseOrderRefundDto>(
        `/api/v1/transaction-service/refunds/${refundId}/process-payment`,
        { adminId, paymentMethod, note }
    );
    
    if (!response.data.data) {
        throw new Error('Failed to process refund payment - no data returned');
    }
    
    return response.data.data;
};

// ========== ADMIN ORDER MANAGEMENT ==========

/**
 * [ADMIN] Get all orders with admin permissions
 */
export const getAllOrdersAdmin = async (options?: {
    sellerId?: string;
    buyerId?: string;
    status?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
}): Promise<{
    orders: OrderDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams();
    
    if (options?.sellerId) params.append('sellerId', options.sellerId);
    if (options?.buyerId) params.append('buyerId', options.buyerId);
    if (options?.status) params.append('status', options.status);
    if (options?.paymentStatus) params.append('paymentStatus', options.paymentStatus);
    if (options?.page !== undefined) params.append('page', options.page.toString());
    if (options?.limit !== undefined) params.append('limit', options.limit.toString());

    const response = await apiClient.get<ApiResponsePageOrderDto>(
        `/api/v1/transaction-service/admin/orders?${params.toString()}`
    );
    
    const pageData = response.data?.data;
    const orders = pageData?.content || [];
    
    return {
        orders: Array.isArray(orders) ? orders : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

/**
 * [ADMIN] Get order details with admin permissions
 */
export const getOrderDetailsAdmin = async (orderId: string): Promise<OrderDto> => {
    const response = await apiClient.get<ApiResponseOrderDto>(
        `/api/v1/transaction-service/admin/orders/${orderId}`
    );
    
    if (!response.data.data) {
        throw new Error('Failed to get order details - no data returned');
    }
    
    return response.data.data;
};

/**
 * [ADMIN] Audit an order
 */
export const auditOrder = async (orderId: string, auditFlag: boolean): Promise<OrderDto> => {
    const params = new URLSearchParams({ auditFlag: auditFlag.toString() });
    
    const response = await apiClient.put<ApiResponseOrderDto>(
        `/api/v1/transaction-service/admin/orders/${orderId}/audit?${params.toString()}`
    );
    
    if (!response.data.data) {
        throw new Error('Failed to audit order - no data returned');
    }
    
    return response.data.data;
};

// ========== DISPUTE MANAGEMENT ==========

/**
 * Get all disputes (public)
 */
export const getAllDisputes = async (options?: {
    status?: string;
    issueType?: string;
    page?: number;
    limit?: number;
}): Promise<{
    disputes: OrderDisputeDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams();
    
    if (options?.status) params.append('status', options.status);
    if (options?.issueType) params.append('issueType', options.issueType);
    if (options?.page !== undefined) params.append('page', options.page.toString());
    if (options?.limit !== undefined) params.append('limit', options.limit.toString());

    const response = await apiClient.get<ApiResponsePageOrderDisputeDto>(
        `/api/v1/transaction-service/disputes?${params.toString()}`
    );
    
    const pageData = response.data?.data;
    const disputes = pageData?.content || [];
    
    return {
        disputes: Array.isArray(disputes) ? disputes : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

/**
 * Create a new dispute
 */
export const createDispute = async (disputeData: OrderDisputeCreateRq): Promise<OrderDisputeDto> => {
    const response = await apiClient.post<ApiResponseOrderDisputeDto>(
        `/api/v1/transaction-service/disputes`,
        disputeData
    );
    
    if (!response.data.data) {
        throw new Error('Failed to create dispute - no data returned');
    }
    
    return response.data.data;
};

/**
 * Update a dispute
 */
export const updateDispute = async (disputeId: string, disputeData: OrderDisputeUpdateRq): Promise<OrderDisputeDto> => {
    const response = await apiClient.put<ApiResponseOrderDisputeDto>(
        `/api/v1/transaction-service/disputes/${disputeId}`,
        disputeData
    );
    
    if (!response.data.data) {
        throw new Error('Failed to update dispute - no data returned');
    }
    
    return response.data.data;
};

/**
 * Get dispute by order ID
 */
export const getDisputeByOrderId = async (orderId: string): Promise<OrderDisputeDto> => {
    const response = await apiClient.get<ApiResponseOrderDisputeDto>(
        `/api/v1/transaction-service/disputes/order/${orderId}`
    );
    
    if (!response.data.data) {
        throw new Error('Failed to get dispute - no data returned');
    }
    
    return response.data.data;
};

// ========== ADMIN DISPUTE MANAGEMENT ==========

/**
 * [ADMIN] Get all disputes with admin permissions
 */
export const getAllDisputesAdmin = async (options?: {
    status?: string;
    issueType?: string;
    page?: number;
    limit?: number;
}): Promise<{
    disputes: OrderDisputeDto[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}> => {
    const params = new URLSearchParams();
    
    if (options?.status) params.append('status', options.status);
    if (options?.issueType) params.append('issueType', options.issueType);
    if (options?.page !== undefined) params.append('page', options.page.toString());
    if (options?.limit !== undefined) params.append('limit', options.limit.toString());

    const response = await apiClient.get<ApiResponsePageOrderDisputeDto>(
        `/api/v1/transaction-service/admin/disputes?${params.toString()}`
    );
    
    const pageData = response.data?.data;
    const disputes = pageData?.content || [];
    
    return {
        disputes: Array.isArray(disputes) ? disputes : [],
        totalElements: pageData?.totalElements || 0,
        totalPages: pageData?.totalPages || 0,
        currentPage: pageData?.number || 0,
        pageSize: pageData?.size || 10,
        hasNext: !(pageData?.last ?? true),
        hasPrevious: !(pageData?.first ?? true),
    };
};

/**
 * [ADMIN] Resolve a dispute
 */
export const adminResolveDispute = async (
    disputeId: string, 
    status: string, 
    autoRefund: boolean = false
): Promise<OrderDisputeDto> => {
    const params = new URLSearchParams({ 
        status, 
        autoRefund: autoRefund.toString() 
    });
    
    const response = await apiClient.post<ApiResponseOrderDisputeDto>(
        `/api/v1/transaction-service/admin/disputes/${disputeId}/resolve?${params.toString()}`
    );
    
    if (!response.data.data) {
        throw new Error('Failed to resolve dispute - no data returned');
    }
    
    return response.data.data;
};

// ========== ADDITIONAL ANALYTICS ==========

/**
 * Get performance metrics for seller
 */
export const getPerformanceMetrics = async (sellerId: string, period?: number): Promise<any> => {
    const params = new URLSearchParams();
    if (period) {
        params.append('period', period.toString());
    }
    
    const baseUrl = `/api/v1/transaction-service/analytics/seller/${sellerId}/performance`;
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    const response = await apiClient.get<ApiResponseObject>(url);
    
    return response.data.data || {};
};

/**
 * Get order status distribution for seller
 */
export const getOrderStatusDistribution = async (sellerId: string, period?: number): Promise<any> => {
    const params = new URLSearchParams();
    if (period) {
        params.append('period', period.toString());
    }
    
    const baseUrl = `/api/v1/transaction-service/analytics/seller/${sellerId}/order-status`;
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    const response = await apiClient.get<ApiResponseObject>(url);
    
    return response.data.data || {};
};

// Default export object với tất cả API functions
const transactionApi = {
    // Order APIs
    createOrder,
    getOrderById,
    getOrdersByBuyer,
    getOrdersBySeller,
    uploadDeliveryProof,
    cancelOrder,
    
    // Analytics APIs
    getAnalyticsOverview,
    getTopProducts,
    getRevenueChartData,
    getCustomerAnalytics,
    
    // Refund APIs - Buyer
    getRefundsByBuyer,
    createRefundRequest,
    getRefundByOrderId,
    
    // Refund APIs - Seller
    getRefundsBySeller,
    approveRefund,
    rejectRefund,
    updateRefundStatus,
    
    // Refund APIs - Admin
    getAllRefundsAdmin,
    adminApproveRefund,
    adminRejectRefund,
    adminForceCompleteRefund,
    processRefundPayment,
};

export default transactionApi;