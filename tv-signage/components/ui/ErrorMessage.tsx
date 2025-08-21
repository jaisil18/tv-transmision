import React from 'react';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message,
  className = ''
}) => {
  return (
    <div 
      className={`error-message ${className}`}
      style={{
        color: '#dc2626',
        padding: '0.5rem',
        borderRadius: '0.375rem',
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca'
      }}
    >
      {message}
    </div>
  );
};

export default ErrorMessage;