import { useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { Eye, EyeOff } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login } = useProjectStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim() && password.trim()) {
      login(email)
    }
  }

  return (
    <div className="w-screen h-screen bg-white flex overflow-hidden">
      {/* Left Side - Login Form */}
      <div className="w-1/2 flex flex-col justify-between p-12 animate-fadeInLeft">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.5"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900">SnapTest</span>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome Back</h1>
            <p className="text-gray-500">Enter your email and password to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="testuser@company.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                autoFocus
                required
              />
            </div>

            {/* Password Input */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  Remember Me
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Forgot Your Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] animate-fadeInUp"
              style={{ animationDelay: '0.5s' }}
            >
              Log In
            </button>

            {/* Divider */}
            <div className="relative my-6 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or Login With</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">Apple</span>
              </button>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm text-gray-600 animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
              Don't Have An Account?{' '}
              <button type="button" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                Register Now.
              </button>
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 animate-fadeInUp" style={{ animationDelay: '0.9s' }}>
          <p>Copyright © 2025 Emirates NBD</p>
          <button className="hover:text-gray-700 transition-colors">Privacy Policy</button>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-12 flex flex-col items-center justify-center text-white relative overflow-hidden animate-fadeInRight">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 max-w-lg text-center mb-12 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-5xl font-bold mb-4 leading-tight">
            Automate testing with visual flow builder.
          </h2>
          <p className="text-indigo-100 text-lg">
            Create, manage, and execute automated tests without writing code.
          </p>
        </div>

        {/* Dashboard Preview Card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-white/20 animate-scaleIn" style={{ animationDelay: '0.5s' }}>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Metric Cards */}
            <div className="bg-indigo-500/40 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-xs text-indigo-100 mb-1">Total Projects</div>
              <div className="text-2xl font-bold">24</div>
              <div className="text-xs text-green-300">↑ Active</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-xs text-indigo-100 mb-1">Test Flows</div>
              <div className="text-2xl font-bold">156</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-xs text-indigo-100 mb-1">Success Rate</div>
              <div className="text-2xl font-bold">98%</div>
            </div>
          </div>

          {/* Test Steps Visualization */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/20 mb-4">
            <div className="text-xs text-indigo-100 mb-3">Recent Test Execution</div>
            <div className="space-y-2">
              {[
                { step: 'Navigate to URL', status: 'success' },
                { step: 'Click Login Button', status: 'success' },
                { step: 'Enter Credentials', status: 'success' },
                { step: 'Submit Form', status: 'success' },
                { step: 'Verify Dashboard', status: 'success' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm animate-fadeInUp"
                  style={{ animationDelay: `${0.6 + i * 0.1}s` }}
                >
                  <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-white/90">{item.step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Automation Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-indigo-100">Tests Automated</div>
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold">2,847</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-indigo-100">Time Saved</div>
                <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold">480hrs</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes growUp {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }

        @keyframes fillDonut {
          from {
            stroke-dashoffset: 351.86;
          }
          to {
            stroke-dashoffset: 87.96;
          }
        }

        .animate-fadeInLeft {
          animation: fadeInLeft 0.6s ease-out;
        }

        .animate-fadeInRight {
          animation: fadeInRight 0.6s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: backwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.8s ease-out;
          animation-fill-mode: backwards;
        }
      `}</style>
    </div>
  )
}

export default Login
