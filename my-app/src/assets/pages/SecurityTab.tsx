import React, { useState } from 'react';
import type { components } from '../../api-types/userService';
import apiClient from '../../services/apiClient';

const SecurityTab: React.FC = () => {
  // Đổi mật khẩu
  const [pwdForm, setPwdForm] = useState<components['schemas']['ChangePwdRequest']>({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState<boolean | null>(null);
  const [twoFAMsg, setTwoFAMsg] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [otpDisable, setOtpDisable] = useState('');

  // Lấy trạng thái 2FA
  React.useEffect(() => {
    apiClient.get('/api/v1/user-service/auth/me').then(res => {
      setTwoFAEnabled(res.data.data?.twoFactorEnabled ?? false);
    });
  }, []);

  // Đổi mật khẩu
  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg('');
    try {
      const res = await apiClient.post('/api/v1/user-service/auth/change-password', pwdForm);
      setPwdMsg(res.data.message || 'Đổi mật khẩu thành công');
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwdMsg(err?.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setPwdLoading(false);
    }
  };

  // Bật/Tắt 2FA
  const handleToggle2FA = async () => {
    setTwoFALoading(true);
    setTwoFAMsg('');
    try {
      if (twoFAEnabled) {
        // Tắt 2FA: trước tiên gọi GET để lấy thông tin xác thực (nếu cần)
        await apiClient.get('/api/v1/user-service/auth/disable-2fa');
        setTwoFAMsg('OTP đã được gửi qua email. Vui lòng kiểm tra email để xác thực.');
        setShowDisable2FA(true);
      } else {
        // Bật 2FA: chỉ cần gọi GET, OTP sẽ gửi qua email
        await apiClient.post('/api/v1/user-service/auth/enable-2fa');
        setTwoFAEnabled(true);
      }
    } catch (err: any) {
      setTwoFAMsg(err?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-8">
      <h2 className="font-bold text-xl mb-6">Bảo mật tài khoản</h2>
      {/* Đổi mật khẩu */}
      <form onSubmit={handleChangePwd} className="space-y-4 mb-8">
        <div className="font-semibold">Đổi mật khẩu</div>
        <input type="password" placeholder="Mật khẩu cũ" value={pwdForm.oldPassword} onChange={e => setPwdForm(f => ({ ...f, oldPassword: e.target.value }))} className="w-full border rounded px-3 py-2" />
        <input type="password" placeholder="Mật khẩu mới" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} className="w-full border rounded px-3 py-2" />
        <input type="password" placeholder="Nhập lại mật khẩu mới" value={pwdForm.confirmPassword} onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} className="w-full border rounded px-3 py-2" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={pwdLoading}>Đổi mật khẩu</button>
        {pwdMsg && <div className="text-red-500 mt-2">{pwdMsg}</div>}
      </form>
      {/* 2FA */}
      <div className="mb-4">
        <div className="font-semibold mb-2">Xác thực 2 bước (2FA)</div>
        <button onClick={handleToggle2FA} className={`px-4 py-2 rounded ${twoFAEnabled ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`} disabled={twoFALoading}>
          {twoFAEnabled ? 'Tắt 2FA' : 'Bật 2FA'}
        </button>
        {showDisable2FA && (
          <form
            onSubmit={async e => {
              e.preventDefault();
              setTwoFALoading(true);
              setTwoFAMsg('');
              try {
                await apiClient.post('/api/v1/user-service/auth/disable-2fa', { otp: otpDisable });
                setTwoFAMsg('Đã tắt 2FA');
                setTwoFAEnabled(false);
                setShowDisable2FA(false);
                setOtpDisable('');
              } catch (err: any) {
                setTwoFAMsg(err?.response?.data?.message || 'Tắt 2FA thất bại');
              } finally {
                setTwoFALoading(false);
              }
            }}
            className="mt-4 space-y-2"
          >
            <input
              type="text"
              placeholder="Nhập mã OTP để tắt 2FA"
              value={otpDisable}
              onChange={e => setOtpDisable(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
            <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded" disabled={twoFALoading || !otpDisable}>
              Xác nhận tắt 2FA
            </button>
          </form>
        )}
        {twoFAMsg && <div className="text-red-500 mt-2">{twoFAMsg}</div>}
      </div>
    </div>
  );
};

export default SecurityTab;
