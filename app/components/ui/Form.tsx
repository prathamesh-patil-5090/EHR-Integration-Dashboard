import { ReactNode, FormEvent } from 'react';

interface FormProps {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  className?: string;
}

interface InputProps {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}

interface FormContainerProps {
  children: ReactNode;
  className?: string;
}

export function Form({ onSubmit, children, className = '' }: FormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {children}
    </form>
  );
}

export function Input({
  id,
  name,
  type,
  label,
  placeholder,
  defaultValue,
  required = false,
  className = ''
}: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-blue-800 mb-2">
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={`w-full px-4 py-3 text-blue-900 bg-blue-50/50 border border-blue-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${className}`}
        placeholder={placeholder}
      />
    </div>
  );
}

export function FormContainer({ children, className = '' }: FormContainerProps) {
  return (
    <div className={`bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-blue-100 ${className}`}>
      {children}
    </div>
  );
}
