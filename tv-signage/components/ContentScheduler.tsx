'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, Play, Pause } from 'lucide-react';
import AccessibleButton from './AccessibleButton';
import AccessibleModal from './AccessibleModal';

interface ScheduleItem {
  id: string;
  name: string;
  contentId: string;
  contentName: string;
  screenIds: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  priority: number;
  recurring: boolean;
  active: boolean;
}

interface ContentSchedulerProps {
  screenId?: string;
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

// Componentes de Card simples
const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-white rounded-lg shadow-uct border border-uct-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: CardHeaderProps) => (
  <div className="p-6 pb-4">{children}</div>
);

const CardContent = ({ children, className = '' }: CardContentProps) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: CardTitleProps) => (
  <h3 className={`text-lg font-semibold text-uct-primary ${className}`}>{children}</h3>
);

const CardDescription = ({ children }: CardDescriptionProps) => (
  <p className="text-sm text-uct-gray-600 mt-1">{children}</p>
);

export default function ContentScheduler({ screenId }: ContentSchedulerProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    contentId: '',
    screenIds: [] as string[],
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [] as number[],
    priority: 1,
    recurring: false
  });

  const daysOfWeekLabels = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  useEffect(() => {
    fetchSchedules();
  }, [screenId]);

  const fetchSchedules = async () => {
    try {
      const url = screenId ? `/api/schedules?screenId=${screenId}` : '/api/schedules';
      const response = await fetch(url);
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingSchedule ? 'PUT' : 'POST';
      const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : '/api/schedules';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          active: true
        })
      });

      if (response.ok) {
        await fetchSchedules();
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleEdit = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      contentId: schedule.contentId,
      screenIds: schedule.screenIds,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      daysOfWeek: schedule.daysOfWeek,
      priority: schedule.priority,
      recurring: schedule.recurring
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta programación?')) return;
    
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      await fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      });
      await fetchSchedules();
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contentId: '',
      screenIds: [],
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      priority: 1,
      recurring: false
    });
    setEditingSchedule(null);
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-uct-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-uct-primary">Programación de Contenido</h2>
          <p className="text-uct-gray-600">Gestiona cuándo y dónde se reproduce el contenido</p>
        </div>
        <AccessibleButton
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Programación
        </AccessibleButton>
      </div>

      {/* Lista de programaciones */}
      <div className="grid gap-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-uct-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-uct-gray-900 mb-2">No hay programaciones</h3>
              <p className="text-uct-gray-600 mb-4">Crea tu primera programación para automatizar la reproducción de contenido</p>
              <AccessibleButton onClick={() => setShowModal(true)}>
                Crear Programación
              </AccessibleButton>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} className={`${!schedule.active ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {schedule.name}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        schedule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Contenido: {schedule.contentName} | Prioridad: {schedule.priority}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <AccessibleButton
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(schedule.id, schedule.active)}
                      title={schedule.active ? 'Pausar' : 'Activar'}
                    >
                      {schedule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </AccessibleButton>
                    <AccessibleButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </AccessibleButton>
                    <AccessibleButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      title="Eliminar"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </AccessibleButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-uct-gray-700">Período</p>
                    <p className="text-uct-gray-600">
                      {new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-uct-gray-700">Horario</p>
                    <p className="text-uct-gray-600">
                      {schedule.startTime} - {schedule.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-uct-gray-700">Días</p>
                    <p className="text-uct-gray-600">
                      {schedule.daysOfWeek.length === 7 
                        ? 'Todos los días'
                        : schedule.daysOfWeek.map((day: number) => daysOfWeekLabels[day]).join(', ')
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de creación/edición */}
      <AccessibleModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingSchedule ? 'Editar Programación' : 'Nueva Programación'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-uct-gray-700">Nombre</label>
              <input
                type="text"
                id="name"
                className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="contentId" className="block text-sm font-medium text-uct-gray-700">Contenido</label>
              <input
                type="text"
                id="contentId"
                className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={formData.contentId}
                onChange={(e) => setFormData({...formData, contentId: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="screenIds" className="block text-sm font-medium text-uct-gray-700">Pantallas</label>
              <input type="text" id="screenIds" className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value={formData.screenIds.join(', ')} readOnly />
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-uct-gray-700">Fecha de Inicio</label>
              <input
                type="date"
                id="startDate"
                className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-uct-gray-700">Fecha de Fin</label>
              <input
                type="date"
                id="endDate"
                className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-uct-gray-700">Hora de Inicio</label>
              <input
                type="time"
                id="startTime"
                className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-uct-gray-700">Hora de Fin</label>
              <input
                type="time"
                id="endTime"
                className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="daysOfWeek" className="block text-sm font-medium text-uct-gray-700">Días de la Semana</label>
              <div className="grid grid-cols-3 gap-2">
                {daysOfWeekLabels.map((day: string, index: number) => (
                  <label key={index} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 rounded border-gray-300 text-uct-primary focus:ring-uct-primary" 
                      checked={formData.daysOfWeek.includes(index)}
                      onChange={() => handleDayToggle(index)}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-uct-gray-700">Prioridad</label>
              <input
                type="number"
                id="priority"
                className="mt-1 focus:ring-uct-primary focus:border-uct-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <label htmlFor="recurring" className="block text-sm font-medium text-uct-gray-700">Recurrencia</label>
              <input
                type="checkbox"
                id="recurring"
                className="form-checkbox h-4 w-4 rounded border-gray-300 text-uct-primary focus:ring-uct-primary"
                checked={formData.recurring}
                onChange={(e) => setFormData({...formData, recurring: e.target.checked })}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <AccessibleButton 
              type="button" 
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </AccessibleButton>
            <AccessibleButton type="submit"> 
              {editingSchedule ? 'Guardar Cambios' : 'Crear Programación'}
            </AccessibleButton>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
}
