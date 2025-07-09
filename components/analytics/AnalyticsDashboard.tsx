'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Monitor, Play, Users, Clock, TrendingUp, Activity } from 'lucide-react';

interface AnalyticsData {
  screenUsage: Array<{ name: string; hours: number; }>;
  contentPopularity: Array<{ name: string; views: number; }>;
  systemStats: {
    totalScreens: number;
    activeScreens: number;
    totalContent: number;
    avgUptime: number;
  };
}

const COLORS = ['#2D1B69', '#20B2AA', '#FFD700', '#EF4444', '#10B981'];

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-uct-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-uct-primary">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-uct-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '24h' ? '24 Horas' : range === '7d' ? '7 Días' : '30 Días'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-uct">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pantallas</p>
              <p className="text-2xl font-bold text-uct-primary">{analytics?.systemStats.totalScreens || 0}</p>
            </div>
            <Monitor className="h-8 w-8 text-uct-accent" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-uct">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pantallas Activas</p>
              <p className="text-2xl font-bold text-uct-success">{analytics?.systemStats.activeScreens || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-uct-success" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-uct">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contenido Total</p>
              <p className="text-2xl font-bold text-uct-secondary">{analytics?.systemStats.totalContent || 0}</p>
            </div>
            <Play className="h-8 w-8 text-uct-secondary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-uct">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime Promedio</p>
              <p className="text-2xl font-bold text-uct-info">{analytics?.systemStats.avgUptime || 0}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-uct-info" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uso de Pantallas */}
        <div className="bg-white p-6 rounded-lg shadow-uct">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso de Pantallas (Horas)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.screenUsage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#2D1B69" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Popularidad de Contenido */}
        <div className="bg-white p-6 rounded-lg shadow-uct">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contenido Más Popular</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics?.contentPopularity || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const { name, percent } = props;
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="views"
              >
                {(analytics?.contentPopularity || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}