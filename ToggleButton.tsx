import React from 'react';

interface ToggleButtonProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isOn, onToggle, disabled }) => {
  return (
    <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative w-14 h-8 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50
          ${isOn ? 'bg-purple-600' : 'bg-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Toggle Mayra"
      >
        <div
          className={`
            absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out
            ${isOn ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
      </button>
      <span className={`text-sm font-medium tracking-wide transition-opacity duration-300 ${isOn ? 'text-purple-300' : 'text-gray-500'}`}>
        {isOn ? 'MAYRA ON' : 'MAYRA OFF'}
      </span>
    </div>
  );
};

export default ToggleButton;
