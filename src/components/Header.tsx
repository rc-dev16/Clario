// ... existing imports ...
import { Scale, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState } from 'react';

// Profile Modal Component
const ProfileModal = ({ user, onClose }: { user: any, onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/30">
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm p-0 relative animate-fade-in">
      <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold">&times;</button>
      <div className="p-6 pb-4 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">Profile</h2>
        <p className="text-center text-gray-500 text-sm mb-2">View your account details and plan information</p>
      </div>
      <div className="px-6 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500 font-medium">Name</div>
          <div className="font-semibold text-base text-gray-900">{user.name}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500 font-medium">Email</div>
          <div className="text-base text-gray-800">{user.email}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500 font-medium">Password</div>
          <div className="tracking-widest text-base text-gray-800">********</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500 font-medium">Contracts Analyzed</div>
          <div className="text-base text-gray-800">{user.contractsAnalyzed}</div>
        </div>
        {/* Plan Section */}
        <div className="flex flex-col gap-1 mt-2 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.plan === 'free' ? 'bg-blue-50 text-blue-700' : user.plan === 'pro' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>{user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan</span>
            {/* Add icon or badge if needed */}
          </div>
          <div className="text-xs text-gray-500">
            {user.plan === 'free' && 'Basic features and limited analyses.'}
            {user.plan === 'pro' && 'Pro features with higher limits and support.'}
            {user.plan === 'enterprise' && 'Enterprise features and premium support.'}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}> 
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-blue-600 ">
                Clario
              </h1>
            </div>
          </div>
          {/* Account section */}
          <div className="relative flex items-center gap-2">
            {user && location.pathname !== '/dashboard' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold flex items-center justify-center h-9 w-9"
                title="Dashboard"
              >
                <LayoutDashboard className="h-5 w-5" />
              </button>
            )}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="flex items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition h-9 w-9"
                  title="Profile"
                >
                  <User className="h-5 w-5" />
                </button>
                {showMenu && (
                  <div className="absolute left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => { setShowProfileModal(true); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => { logout(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                Sign In
              </button>
            )}
            {/* Back button removed as requested */}
          </div>
        </div>
      </div>
      {showProfileModal && user && (
        <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  );
};

export default Header;