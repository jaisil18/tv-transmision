'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UCTLogo from '@/components/UCTLogo';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { StaggerContainer, StaggerItem, PremiumHover } from '@/components/animations/PageTransition';

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [resetData, setResetData] = useState({ username: '', token: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          router.push('/admin');
        }
      } catch (error) {
        console.log('No hay sesión activa');
      }
    };
    checkAuth();
  }, [router]);

  const handleAdminAccess = () => {
    setShowLogin(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin');
      } else {
        setError(data.error || 'Error de autenticación');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (resetStep === 1) {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: resetData.username })
        });

        const data = await response.json();

        if (response.ok) {
          setResetToken(data.resetToken);
          setResetStep(2);
          setError('');
        } else {
          setError(data.error || 'Error al generar token');
        }
      } else {
        const response = await fetch('/api/auth/reset-password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: resetData.token,
            newPassword: resetData.newPassword,
            confirmPassword: resetData.confirmPassword
          })
        });

        const data = await response.json();

        if (response.ok) {
          setShowResetForm(false);
          setShowLogin(true);
          setResetStep(1);
          setResetData({ username: '', token: '', newPassword: '', confirmPassword: '' });
          setError('');
          alert('Contraseña restablecida exitosamente');
        } else {
          setError(data.error || 'Error al cambiar contraseña');
        }
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowLogin(false);
    setShowResetForm(false);
    setShowPassword(false);
    setCredentials({ username: '', password: '' });
    setResetData({ username: '', token: '', newPassword: '', confirmPassword: '' });
    setError('');
    setResetStep(1);
    setResetToken('');
  };

  return (
    <motion.div 
      className="min-h-screen bg-uct-gradient flex items-center justify-center p-2 sm:p-4 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Efectos de fondo animados */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-uct-secondary/10 via-transparent to-uct-secondary/10"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Partículas flotantes */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-uct-secondary/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
            type: "tween",
          }}
        />
      ))}
      
      <motion.div 
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden w-full max-w-6xl flex flex-col lg:flex-row min-h-[90vh] lg:min-h-auto relative z-10"
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Panel Principal */}
        <motion.div 
          className={`p-4 sm:p-6 lg:p-8 text-center transition-all duration-500 flex flex-col justify-center relative overflow-hidden ${
            showLogin || showResetForm
              ? 'lg:w-1/2 hidden lg:flex'
              : 'w-full min-h-[60vh] sm:min-h-auto'
          }`}
          layout
        >
          {/* Efecto de fondo sutil */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-uct-primary/5 via-transparent to-uct-secondary/5"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              type: "tween",
            }}
          />
          
          {/* Logo y título principal */}
          <StaggerContainer>
            <motion.div className="mb-4 sm:mb-6 relative z-10">
              <StaggerItem>
                <PremiumHover scale={1.05} y={-5}>
                  <motion.div 
                    className="flex justify-center mb-4 sm:mb-6"
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.6 }}
                  >
                    <UCTLogo
                      size={50}
                      variant="full"
                      className="mx-auto sm:scale-110"
                    />
                  </motion.div>
                </PremiumHover>
              </StaggerItem>
              
              <StaggerItem>
                <motion.h1 
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <span className="bg-gradient-to-r from-uct-primary via-uct-primary to-uct-secondary bg-clip-text text-transparent">
                    TV
                  </span>{' '}
                  <span className="text-uct-secondary">CODECRAFT</span>
                </motion.h1>
              </StaggerItem>
              
              <StaggerItem>
                <motion.p 
                  className="text-sm sm:text-base text-uct-gray-600 mb-6 sm:mb-8 px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Sistema de Transmisión Digital
                </motion.p>
              </StaggerItem>
            </motion.div>
          </StaggerContainer>

          {/* Botón de acceso */}
          <StaggerItem>
            <motion.button
              onClick={handleAdminAccess}
              disabled={showLogin || showResetForm}
              className="w-full max-w-md mx-auto bg-gradient-to-r from-uct-primary to-uct-primary/90 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group text-sm sm:text-base"
              whileHover={{ 
                scale: showLogin || showResetForm ? 1 : 1.02,
                y: showLogin || showResetForm ? 0 : -2,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: showLogin || showResetForm ? 1 : 0.98 }}
            >
              {/* Efecto de brillo */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                whileHover={{
                  translateX: showLogin || showResetForm ? "-100%" : "200%",
                  transition: { duration: 0.6, ease: "easeInOut" }
                }}
              />
              <span className="relative z-10">
                <span className="hidden sm:inline">Acceder al Panel de Administración</span>
                <span className="sm:hidden">Acceder al Panel</span>
              </span>
            </motion.button>
          </StaggerItem>

          {/* Botón de emergencia para debug */}
          <button
            onClick={() => {
              console.log('🚨 [Emergency] Botón de emergencia clickeado');
              window.location.href = '/admin';
            }}
            className="mt-4 w-full max-w-md mx-auto bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
          >
            🚨 Acceso Directo (Debug)
          </button>

          <p className="text-xs sm:text-sm text-uct-gray-500 mt-4 sm:mt-6 px-2">
            Gestiona pantallas, contenido y listas de reproducción
          </p>
        </motion.div>

        {/* Panel de Login */}
        {(showLogin || showResetForm) && (
          <div className="w-full lg:w-1/2 bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col justify-center min-h-[50vh] lg:min-h-auto">
            {/* Header móvil */}
            <div className="lg:hidden text-center mb-4">
              <UCTLogo size={40} variant="full" className="mx-auto mb-2" />
              <h3 className="text-lg font-bold text-uct-primary">
                TV <span className="text-uct-secondary">CODECRAFT</span>
              </h3>
            </div>

            <div className="max-w-sm mx-auto w-full">
              {/* Botón de regreso */}
              <button
                onClick={resetForm}
                className="flex items-center text-uct-gray-600 hover:text-uct-primary mb-4 sm:mb-6 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </button>

              {/* Formulario de Login */}
              {showLogin && !showResetForm && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-uct-primary mb-4 sm:mb-6 text-center">
                    Iniciar Sesión
                  </h2>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 flex items-center text-sm">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-uct-gray-700 mb-2">
                        Usuario
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={credentials.username}
                          onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                          className="w-full pl-10 pr-4 py-2 sm:py-3 border border-uct-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm"
                          placeholder="Ingresa tu usuario"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-uct-gray-700 mb-2">
                        Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 w-4 h-4" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                          className="w-full pl-10 pr-12 py-2 sm:py-3 border border-uct-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm"
                          placeholder="Ingresa tu contraseña"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 hover:text-uct-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-uct-primary text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-uct-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
                    >
                      {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                  </form>

                  {/* Link para restablecer contraseña */}
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogin(false);
                        setShowResetForm(true);
                        setError('');
                      }}
                      className="text-xs sm:text-sm text-uct-primary hover:text-uct-primary/80 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario de Restablecimiento */}
              {showResetForm && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-uct-primary mb-4 sm:mb-6 text-center">
                    {resetStep === 1 ? 'Restablecer Contraseña' : 'Nueva Contraseña'}
                  </h2>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 flex items-center text-sm">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {resetToken && resetStep === 2 && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 text-sm">
                      <strong>Token generado:</strong> {resetToken}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {resetStep === 1 ? (
                      <div>
                        <label className="block text-sm font-medium text-uct-gray-700 mb-2">
                          Usuario
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            value={resetData.username}
                            onChange={(e) => setResetData({...resetData, username: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 sm:py-3 border border-uct-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm"
                            placeholder="Ingresa tu usuario"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-uct-gray-700 mb-2">
                            Token de Recuperación
                          </label>
                          <div className="relative">
                            <RotateCcw className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={resetData.token}
                              onChange={(e) => setResetData({...resetData, token: e.target.value})}
                              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-uct-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm"
                              placeholder="Ingresa el token"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-uct-gray-700 mb-2">
                            Nueva Contraseña
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 w-4 h-4" />
                            <input
                              type="password"
                              value={resetData.newPassword}
                              onChange={(e) => setResetData({...resetData, newPassword: e.target.value})}
                              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-uct-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm"
                              placeholder="Nueva contraseña"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-uct-gray-700 mb-2">
                            Confirmar Contraseña
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-uct-gray-400 w-4 h-4" />
                            <input
                              type="password"
                              value={resetData.confirmPassword}
                              onChange={(e) => setResetData({...resetData, confirmPassword: e.target.value})}
                              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-uct-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm"
                              placeholder="Confirma la contraseña"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-uct-primary text-white py-2 sm:py-3 px-4 rounded-lg hover:bg-uct-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
                    >
                      {loading ? 'Procesando...' : (resetStep === 1 ? 'Generar Token' : 'Cambiar Contraseña')}
                    </button>
                  </form>

                  {/* Link de regreso al login */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(false)}
                      className="text-xs sm:text-sm text-uct-primary hover:text-uct-primary/80 transition-colors"
                    >
                      Volver al login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}