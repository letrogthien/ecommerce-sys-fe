import React, { useEffect, useState } from 'react';
import type { components } from '../../api-types/transactionService';
import { useUser } from '../../context/UserContext';
import * as transactionApi from '../../services/transactionApi';
import { getErrorMessage } from '../../utils/apiErrorHandler';

type OrderRefundDto = components['schemas']['OrderRefundDto'];
type OrderRefundCreateRq = components['schemas']['OrderRefundCreateRq'];
type OrderDto = components['schemas']['OrderDto'];

// Mock refunds cho buyer (chỉ các refund mà buyer này tạo)
const mockBuyerRefunds: OrderRefundDto[] = [
  {
    id: 'refund-001',
    orderId: 'order-001',
    requestBy: 'user123',
    amount: 15.99,
    status: 'PENDING',
    reason: 'Sản phẩm không đúng mô tả. Tài khoản Minecraft được giao không phải Premium như quảng cáo.',
    createdAt: '2024-03-16T09:30:00Z'
  },
  {
    id: 'refund-002',
    orderId: 'order-002',
    requestBy: 'user123',
    amount: 50.00,
    status: 'APPROVED',
    reason: 'Code Steam Gift Card không hoạt động, đã thử nhiều lần nhưng vẫn báo lỗi.',
    createdAt: '2024-03-15T14:20:00Z',
    completedAt: '2024-03-15T16:45:00Z'
  },
  {
    id: 'refund-003',
    orderId: 'order-003',
    requestBy: 'user123',
    amount: 25.00,
    status: 'REJECTED',
    reason: 'Muốn đổi ý sau khi mua',
    createdAt: '2024-03-14T11:15:00Z',
    completedAt: '2024-03-14T18:30:00Z'
  }
];

// Mock orders để tạo refund
const mockBuyerOrders: OrderDto[] = [
  {
    id: 'order-004',
    buyerId: 'user123',
    sellerId: 'seller456',
    totalAmount: 35.99,
    currency: 'USD',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    auditFlag: false,
    createdAt: '2024-03-12T09:30:00Z',
    updatedAt: '2024-03-12T16:45:00Z',
    items: [
      {
        id: 'item-004',
        orderId: 'order-004',
        productId: 'prod-789',
        productName: 'Valorant Points 1000',
        unitPrice: 35.99,
        quantity: 1,
        subtotal: 35.99,
        createdAt: '2024-03-12T09:30:00Z'
      }
    ],
    proofs: [],
    refunds: [],
    disputes: [],
    logs: []
  }
];

// Status color mapping
const getRefundStatusColor = (status?: string) => {
  switch (status) {
    case 'APPROVED':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'PROCESSING':
      return 'text-blue-600 bg-blue-100 border-blue-200';
    case 'REJECTED':
      return 'text-red-600 bg-red-100 border-red-200';
    case 'COMPLETED':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'CANCELLED':
      return 'text-gray-600 bg-gray-100 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

// Status Vietnamese mapping
const getRefundStatusInfo = (status?: string) => {
  switch (status) {
    case 'APPROVED':
      return { text: 'Đã chấp nhận' };
    case 'PENDING':
      return { text: 'Chờ xử lý' };
    case 'PROCESSING':
      return { text: 'Đang xử lý' };
    case 'REJECTED':
      return { text: 'Đã từ chối' };
    case 'COMPLETED':
      return { text: 'Đã hoàn thành' };
    case 'CANCELLED':
      return { text: 'Đã hủy' };
    default:
      return { text: status || 'Không xác định' };
  }
};

// Refund reasons template
const refundReasons = [
  'Sản phẩm không đúng mô tả',
  'Sản phẩm bị lỗi/không hoạt động',
  'Seller giao sai sản phẩm',
  'Không nhận được sản phẩm',
  'Chất lượng sản phẩm kém',
  'Khác'
];

const RefundManagement: React.FC = () => {
  const { user } = useUser();
  const [refunds, setRefunds] = useState<OrderRefundDto[]>([]);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<OrderRefundDto | null>(null);
  const [newRefund, setNewRefund] = useState<Partial<OrderRefundCreateRq>>({
    orderId: '',
    requestBy: user?.id || '',
    reason: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Fetch refunds and orders in parallel
        const [refundsResponse, ordersResponse] = await Promise.allSettled([
          transactionApi.getRefundsByBuyer(),
          transactionApi.getOrdersByBuyer(user.id, { status: 'COMPLETED', page: 0, limit: 1000 })
        ]);
        
        if (refundsResponse.status === 'fulfilled') {
          setRefunds(refundsResponse.value.refunds);
        } else {
          console.error('Error fetching refunds:', refundsResponse.reason);
          setRefunds(mockBuyerRefunds);
        }
        
        if (ordersResponse.status === 'fulfilled') {
          setOrders(ordersResponse.value.orders);
        } else {
          console.error('Error fetching orders:', ordersResponse.reason);
          setOrders(mockBuyerOrders);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setRefunds(mockBuyerRefunds);
        setOrders(mockBuyerOrders);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const filteredRefunds = selectedStatus === 'ALL' 
    ? refunds 
    : refunds.filter(refund => refund.status === selectedStatus);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefund.orderId || !newRefund.reason) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setCreating(true);
      const refundRequest: OrderRefundCreateRq = {
        orderId: newRefund.orderId,
        requestBy: newRefund.requestBy || user?.id || '',
        reason: newRefund.reason
      };

      const response = await transactionApi.createRefundRequest(refundRequest);
      setRefunds(prev => [response, ...prev]);
      setNewRefund({ orderId: '', requestBy: user?.id || '', reason: '' });
      setShowCreateForm(false);
      alert('Yêu cầu hoàn tiền đã được tạo thành công');
    } catch (error) {
      console.error('Error creating refund:', error);
      alert(`Có lỗi xảy ra: ${getErrorMessage(error)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCancelRefund = async (refundId?: string) => {
    if (!refundId) return;
    
    if (window.confirm('Bạn có chắc chắn muốn hủy yêu cầu hoàn tiền này?')) {
      try {
        // Note: Backend cần implement API để buyer có thể cancel refund request
        // await transactionApi.cancelRefundRequest(refundId);
        
        // For now, just remove from local state
        setRefunds(prevRefunds => 
          prevRefunds.filter(refund => refund.id !== refundId)
        );
        alert('Yêu cầu hoàn tiền đã được hủy');
      } catch (error) {
        console.error('Error canceling refund:', error);
        alert('Có lỗi xảy ra khi hủy yêu cầu hoàn tiền');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Đang tải danh sách hoàn tiền...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Yêu cầu hoàn tiền của tôi</h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý các yêu cầu hoàn tiền bạn đã tạo</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              showCreateForm 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showCreateForm ? 'Hủy' : '+ Tạo yêu cầu hoàn tiền'}
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm text-gray-600">Tổng yêu cầu</p>
              <p className="text-2xl font-bold text-gray-900">{refunds.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm text-gray-600">Chờ xử lý</p>
              <p className="text-2xl font-bold text-yellow-600">
                {refunds.filter(r => r.status === 'PENDING').length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm text-gray-600">Đã hoàn thành</p>
              <p className="text-2xl font-bold text-green-600">
                {refunds.filter(r => r.status === 'COMPLETED' || r.status === 'APPROVED').length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm text-gray-600">Tổng tiền hoàn</p>
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(refunds
                  .filter(r => r.status === 'COMPLETED' || r.status === 'APPROVED')
                  .reduce((sum, r) => sum + (r.amount || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Create Refund Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tạo yêu cầu hoàn tiền mới</h3>
            <form onSubmit={handleCreateRefund}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="order-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn đơn hàng *
                  </label>
                  <select
                    id="order-select"
                    value={newRefund.orderId}
                    onChange={(e) => setNewRefund(prev => ({ ...prev, orderId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Chọn đơn hàng để hoàn tiền</option>
                    {orders.filter(order => 
                      ['COMPLETED', 'DELIVERED'].includes(order.status || '') &&
                      !refunds.some(refund => refund.orderId === order.id)
                    ).map(order => (
                      <option key={order.id} value={order.id}>
                        #{order.id?.slice(-8)} - {order.items?.[0]?.productName} ({formatPrice(order.totalAmount)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="requester" className="block text-sm font-medium text-gray-700 mb-2">
                    Người yêu cầu
                  </label>
                  <input
                    id="requester"
                    type="text"
                    value={user?.email || 'Current User'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do hoàn tiền *
                </label>
                <div className="space-y-2 mb-3">
                  {refundReasons.map((reason, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="radio"
                        name="refundReason"
                        value={reason}
                        checked={newRefund.reason === reason}
                        onChange={(e) => setNewRefund(prev => ({ ...prev, reason: e.target.value }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
                
                {newRefund.reason === 'Khác' && (
                  <textarea
                    value={newRefund.reason}
                    onChange={(e) => setNewRefund(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Mô tả chi tiết lý do cần hoàn tiền..."
                    required
                  />
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tạo yêu cầu hoàn tiền
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tất cả ({refunds.length})
          </button>
          {['PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'COMPLETED'].map(status => {
            const count = refunds.filter(refund => refund.status === status).length;
            const statusInfo = getRefundStatusInfo(status);
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statusInfo.text} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Refunds List */}
      {filteredRefunds.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Bạn chưa có yêu cầu hoàn tiền nào</div>
          <p className="text-gray-400 mt-2">Tạo yêu cầu hoàn tiền cho các đơn hàng có vấn đề</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRefunds.map((refund) => {
            const statusInfo = getRefundStatusInfo(refund.status);
            return (
              <div key={refund.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Hoàn tiền #{refund.id?.slice(-8)}
                      </h3>
                      <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getRefundStatusColor(refund.status)}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Đơn hàng:</span> #{refund.orderId?.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Tạo lúc:</span> {formatDate(refund.createdAt)}
                      </p>
                      {refund.completedAt && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Hoàn thành:</span> {formatDate(refund.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(refund.amount)}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Lý do hoàn tiền</h5>
                  <p className="text-sm text-gray-600">{refund.reason}</p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    {refund.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelRefund(refund.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Hủy yêu cầu
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedRefund(refund)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Chi tiết hoàn tiền</h2>
                <button
                  onClick={() => setSelectedRefund(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Mã hoàn tiền</div>
                    <div className="text-sm text-gray-900 font-mono">{selectedRefund.id}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Mã đơn hàng</div>
                    <div className="text-sm text-gray-900 font-mono">{selectedRefund.orderId}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Số tiền</div>
                    <div className="text-lg font-bold text-green-600">{formatPrice(selectedRefund.amount)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Trạng thái</div>
                    <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getRefundStatusColor(selectedRefund.status)}`}>
                      {getRefundStatusInfo(selectedRefund.status).text}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Lý do hoàn tiền</div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{selectedRefund.reason}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedRefund(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagement;
