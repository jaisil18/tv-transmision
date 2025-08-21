'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import UCTLogo from '@/components/UCTLogo';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [resetData, setResetData] = useState({ username: '', token: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: solicitar, 2: ingresar token y nueva contraseña
  const [resetToken, setResetToken] = useState('');

  // Verificar si ya está autenticado
  useEffect(() => {
    console.log('🔍 [Debug] useEffect ejecutándose');
    const checkAuth = async () => {
      try {
        console.log('🔍 [Debug] Verificando autenticación...');
        const response = await fetch('/api/auth/verify');
        console.log('🔍 [Debug] Respuesta auth verify:', response.status);
        if (response.ok) {
          console.log('🔍 [Debug] Usuario ya autenticado, redirigiendo...');
          router.push('/admin');
        } else {
          console.log('🔍 [Debug] Usuario no autenticado');
        }
      } catch (error) {
        console.log('🔍 [Debug] Error verificando auth:', error);
      }
    };
    checkAuth();
  }, [router]);

  // Debug: Monitorear cambios en showLogin
  useEffect(() => {
    console.log('🔍 [Debug] showLogin cambió a:', showLogin);
  }, [showLogin]);

  const handleAdminAccess = () => {
    console.log('🔍 [Debug] Botón de admin clickeado');
    console.log('🔍 [Debug] Estado actual showLogin:', showLogin);
    setShowLogin(true);
    setError('');
    console.log('🔍 [Debug] showLogin establecido a true');
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
        console.log('✅ [Login] Login exitoso, redirigiendo...');
        // Esperar un momento para que la cookie se establezca y luego redirigir
        setTimeout(() => {
          router.push('/admin');
        }, 500); // Aumentar el tiempo para asegurar que la cookie se establezca
      } else {
        console.error('❌ [Login] Error en login:', data.error);
        setError(data.error || 'Error en el login');
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
        // Solicitar token de recuperación
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
        // Cambiar contraseña con token
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
    <div className="min-h-screen bg-uct-gradient flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden w-full max-w-6xl flex flex-col lg:flex-row min-h-[90vh] lg:min-h-auto">
        {/* Panel Principal */}
        <div className={`p-4 sm:p-6 lg:p-8 text-center transition-all duration-500 flex flex-col justify-center ${
          showLogin || showResetForm
            ? 'lg:w-1/2 hidden lg:flex'
            : 'w-full min-h-[60vh] sm:min-h-auto'
        }`}>
          {/* Logo UCT */}
          <div className="mb-4 sm:mb-6">
            <UCTLogo
              size={50}
              variant="full"
              className="mx-auto mb-4 sm:mb-6 sm:scale-110"
            />
          </div>

          {/* Título */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-uct-primary mb-2">
            TV <span className="text-uct-secondary">CODECRAFT</span>
          </h1>

          <p className="text-sm sm:text-base text-uct-gray-600 mb-6 sm:mb-8 px-2">
            Sistema de Señalización Digital
          </p>

          {/* Botón de acceso */}
          <button
            onClick={handleAdminAccess}
            disabled={showLogin || showResetForm}
            className="w-full max-w-md mx-auto bg-uct-primary hover:bg-uct-primary/90 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Acceder al Panel de Administración</span>
            <span className="sm:hidden">Acceder al Panel</span>
          </button>

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
        </div>

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
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 sm:mb-6 transition-colors text-sm sm:text-base lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>

              {/* Botón de regreso para desktop */}
              <button
                onClick={resetForm}
                className="hidden lg:flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>

              {!showResetForm ? (
                /* Formulario de Login */
                <div>
                  <div className="text-center mb-4 sm:mb-6">
                    <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-uct-primary mx-auto mb-3 sm:mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Iniciar Sesión</h2>
                    <p className="text-sm sm:text-base text-gray-600">Accede al panel de administración</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                    {/* Usuario */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Usuario
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        <input
                          type="text"
                          value={credentials.username}
                          onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                          className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm sm:text-base"
                          placeholder="Ingrese su usuario"
                          required
                        />
                      </div>
                    </div>

                    {/* Contraseña */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                        Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                          className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm sm:text-base"
                          placeholder="Ingrese su contraseña"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{error}</span>
                      </div>
                    )}

                    {/* Botón de login */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-uct-primary hover:bg-uct-primary/90 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>

                    {/* Link de recuperación */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowResetForm(true)}
                        className="text-xs sm:text-sm text-uct-primary hover:text-uct-primary/80 transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Formulario de Recuperación */
                <div>
                  <div className="text-center mb-4 sm:mb-6">
                    <RotateCcw className="h-10 w-10 sm:h-12 sm:w-12 text-uct-primary mx-auto mb-3 sm:mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                      {resetStep === 1 ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 px-2">
                      {resetStep === 1
                        ? 'Ingresa tu usuario para generar un token de recuperación'
                        : 'Ingresa el token y tu nueva contraseña'
                      }
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4">
                    {resetStep === 1 ? (
                      /* Paso 1: Solicitar token */
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                          Usuario
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          <input
                            type="text"
                            value={resetData.username}
                            onChange={(e) => setResetData({ ...resetData, username: e.target.value })}
                            className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm sm:text-base"
                            placeholder="Ingrese su usuario"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      /* Paso 2: Token y nueva contraseña */
                      <>
                        {/* Mostrar token generado */}
                        {resetToken && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                            <p className="text-xs sm:text-sm text-yellow-800 mb-2">
                              <strong>Token de recuperación generado:</strong>
                            </p>
                            <code className="bg-yellow-100 px-2 py-1 rounded text-xs sm:text-sm font-mono text-yellow-900 break-all block">
                              {resetToken}
                            </code>
                            <p className="text-xs text-yellow-700 mt-2">
                              Copia este token y pégalo en el campo de abajo
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            Token de Recuperación
                          </label>
                          <input
                            type="text"
                            value={resetData.token}
                            onChange={(e) => setResetData({ ...resetData, token: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm sm:text-base"
                            placeholder="Ingrese el token de recuperación"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            Nueva Contraseña
                          </label>
                          <input
                            type="password"
                            value={resetData.newPassword}
                            onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm sm:text-base"
                            placeholder="Ingrese la nueva contraseña"
                            required
                            minLength={8}
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            Confirmar Contraseña
                          </label>
                          <input
                            type="password"
                            value={resetData.confirmPassword}
                            onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-transparent text-sm sm:text-base"
                            placeholder="Confirme la nueva contraseña"
                            required
                            minLength={8}
                          />
                        </div>
                      </>
                    )}

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 sm:p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{error}</span>
                      </div>
                    )}

                    {/* Botón de acción */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-uct-primary hover:bg-uct-primary/90 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {loading
                        ? (resetStep === 1 ? 'Generando token...' : 'Cambiando contraseña...')
                        : (resetStep === 1 ? 'Generar Token' : 'Cambiar Contraseña')
                      }
                    </button>

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
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
