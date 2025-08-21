'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Server, Terminal, CheckCircle, X } from 'lucide-react';

interface RestartInstructions {
  currentPort: number;
  newPort: number;
  command: string;
  steps: string[];
}

interface NetworkRestartNotificationProps {
  show: boolean;
  instructions: RestartInstructions | null;
  onClose: () => void;
  onCompleted: () => void;
}

export default function NetworkRestartNotification({ 
  show, 
  instructions, 
  onClose, 
  onCompleted 
}: NetworkRestartNotificationProps) {
  const [step, setStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (show) {
      setStep(0);
      setIsCompleted(false);
    }
  }, [show]);

  if (!show || !instructions) return null;

  const handleStepComplete = () => {
    if (step < instructions.steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsCompleted(true);
      setTimeout(() => {
        onCompleted();
        onClose();
      }, 2000);
    }
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(instructions.command);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <Server className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Reinicio del Servidor Requerido
                </h2>
                <p className="text-sm text-gray-600">
                  Puerto: {instructions.currentPort} → {instructions.newPort}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-800 mb-1">
                  Cambio de Puerto Detectado
                </h3>
                <p className="text-sm text-orange-700">
                  Para aplicar el nuevo puerto ({instructions.newPort}), necesitas reiniciar manualmente el servidor de desarrollo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-800 mb-3">Pasos a seguir:</h3>
            
            {instructions.steps.map((stepText, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  index === step
                    ? 'bg-uct-primary/10 border border-uct-primary/20'
                    : index < step
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < step
                    ? 'bg-green-500 text-white'
                    : index === step
                    ? 'bg-uct-primary text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {index < step ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${
                    index === step ? 'text-uct-primary font-medium' : 'text-gray-700'
                  }`}>
                    {stepText}
                  </p>
                  
                  {index === 1 && index === step && (
                    <div className="mt-3 p-3 bg-gray-900 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-400 font-medium">Terminal</span>
                        </div>
                        <button
                          onClick={copyCommand}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                      <code className="text-green-400 text-sm font-mono">
                        {instructions.command}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            
            {!isCompleted ? (
              <button
                onClick={handleStepComplete}
                className="px-6 py-2 bg-uct-primary text-white rounded-lg hover:bg-uct-primary/90 transition-colors"
              >
                {step < instructions.steps.length - 1 ? 'Siguiente' : 'Completado'}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">¡Configuración aplicada!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
