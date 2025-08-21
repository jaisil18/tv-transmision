'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit, Trash2, Play } from 'lucide-react';
import AccessibleButton from '../AccessibleButton';
import Modal from '../Modal';

interface ScheduleItem {
  id: string;
  name: string;
  contentId: string;
  contentName: string;
  screenIds: string[];
  startTime: string;
  endTime: string;
  days: string[];
  isActive: boolean;
  priority: number;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

export default function ContentScheduler() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/scheduler');
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (scheduleData: Partial<ScheduleItem>) => {
    try {
      const url = editingSchedule ? `/api/scheduler/${editingSchedule.id}` : '/api/scheduler';
      const method = editingSchedule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData),
      });

      if (response.ok) {
        fetchSchedules();
        setShowModal(false);
        setEditingSchedule(null);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta programación?')) return;
    
    try {
      const response = await fetch(`/api/scheduler/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const toggleScheduleStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/scheduler/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      
      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-uct-primary">Programador de Contenido</h2>
          <p className="text-gray-600">Programa contenido para reproducir en horarios específicos</p>
        </div>
        <AccessibleButton
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Programación
        </AccessibleButton>
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-lg shadow-uct overflow-hidden">
        {schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay programaciones configuradas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{schedule.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        schedule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        <span>{schedule.contentName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{schedule.startTime} - {schedule.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{schedule.days.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleScheduleStatus(schedule.id, schedule.isActive)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        schedule.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {schedule.isActive ? 'Pausar' : 'Activar'}
                    </button>
                    <AccessibleButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setShowModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </AccessibleButton>
                    <AccessibleButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </AccessibleButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear/editar programación */}
      {showModal && (
        <ScheduleModal
          schedule={editingSchedule}
          onSave={handleSaveSchedule}
          onClose={() => {
            setShowModal(false);
            setEditingSchedule(null);
          }}
        />
      )}
    </div>
  );
}

// Modal component para crear/editar programaciones
function ScheduleModal({ 
  schedule, 
  onSave, 
  onClose 
}: { 
  schedule: ScheduleItem | null;
  onSave: (data: Partial<ScheduleItem>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    contentId: schedule?.contentId || '',
    screenIds: schedule?.screenIds || [],
    startTime: schedule?.startTime || '09:00',
    endTime: schedule?.endTime || '17:00',
    days: schedule?.days || [],
    priority: schedule?.priority || 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={schedule ? 'Editar Programación' : 'Nueva Programación'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la programación
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-uct-primary"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora de inicio
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-uct-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora de fin
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-uct-primary"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Días de la semana
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <label key={day.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.days.includes(day.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, days: [...formData.days, day.value] });
                    } else {
                      setFormData({ ...formData, days: formData.days.filter(d => d !== day.value) });
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <AccessibleButton variant="outline" onClick={onClose}>
            Cancelar
          </AccessibleButton>
          <AccessibleButton type="submit">
            {schedule ? 'Actualizar' : 'Crear'} Programación
          </AccessibleButton>
        </div>
      </form>
    </Modal>
  );
}