import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginAdmin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'Admin' && password === 'JaleFlorist2026') {
      localStorage.setItem('isAdminAuth', 'true');
      navigate('/dashboard');
    } else {
      setError('Username atau Password salah!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F3] font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] w-full max-w-md border border-[#DCC5B2]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F0E4D3] mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2D2420]">Admin Login</h2>
          <p className="text-sm text-gray-500 mt-1">Jalé Florist Dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#D9A299] focus:ring-2 focus:ring-[#D9A299]/30 transition-all bg-gray-50 focus:bg-white"
              placeholder="Masukkan username..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#D9A299] focus:ring-2 focus:ring-[#D9A299]/30 transition-all bg-gray-50 focus:bg-white"
              placeholder="Masukkan password..."
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-[#D9A299] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#C48B84] transition-colors shadow-sm mt-2"
          >
            Masuk ke Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
