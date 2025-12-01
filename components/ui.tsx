import React from 'react';

export const Card: React.FC<{ title: string, icon?: React.ReactNode, children: React.ReactNode, className?: string }> = ({ title, icon, children, className }) => (
    <div className={`p-6 bg-gray-800/50 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 h-full flex flex-col ${className}`}>
        <div className="flex items-center space-x-2 text-lg font-bold text-cyan-400 mb-4">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="flex-grow">{children}</div>
    </div>
);

export const Label: React.FC<{ htmlFor: string, children: React.ReactNode, description?: string }> = ({ htmlFor, children, description }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300 mb-1">
    {children}
    {description && <p className="text-xs text-gray-500 font-normal">{description}</p>}
  </label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
        {...props}
        className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:bg-gray-700 disabled:cursor-not-allowed"
    >
        {props.children}
    </select>
);

export const Checkbox: React.FC<{ id: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; }> = ({ id, label, checked, onChange, disabled }) => (
    <div className="flex items-center">
        <input
            id={id}
            name={id}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-600 bg-gray-900/50 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-300">
            {label}
        </label>
    </div>
);

interface SliderInputProps {
    id: string;
    label: string;
    description?: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
}

export const SliderInput: React.FC<SliderInputProps> = ({ id, label, description, value, onChange, min = 0, max = 10, step = 0.1, disabled }) => (
    <div>
        <Label htmlFor={id} description={description}>{label}</Label>
        <div className="flex items-center space-x-4">
            <input
                id={id}
                name={id}
                type="range"
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Input
                type="number"
                name={id}
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                className="w-24 text-center"
            />
        </div>
    </div>
);