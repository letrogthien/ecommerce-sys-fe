import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { components } from '../../api-types/userService';
import apiClient from '../../services/apiClient';

const ResetPassword: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Lấy token từ query string
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token') || '';

  const validate = () => {
    if (!password || !confirmPassword) return 'Vui lòng nhập đầy đủ thông tin';
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp';
    if (!token) return 'Token không hợp lệ hoặc đã hết hạn';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload: components['schemas']['ResetPwdRequest'] = {
        newPassword: password,
        confirmPassword: confirmPassword,
        
      };
      await apiClient.post(`/api/v1/user-service/auth/reset-password?token=${encodeURIComponent(token)}`, payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-4 bg-gray-50 flex-1 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Đặt lại mật khẩu</h2>
            <p className="text-gray-600">Nhập mật khẩu mới cho tài khoản của bạn</p>
          </div>
          {success ? (
            <div className="text-center">
              <p className="text-green-600 font-semibold mb-4">Mật khẩu đã được đặt lại thành công!</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Đăng nhập
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Nhập mật khẩu mới"
                    required
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResetPassword;
