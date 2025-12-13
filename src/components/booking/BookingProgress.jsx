import React from 'react';

const BookingProgress = ({ steps, currentStep }) => {
  return (
    <div className="booking-progress">
      <div className="hidden sm:flex justify-between">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex-1 flex flex-col items-center ${index === steps.length - 1 ? '' : 'relative'}`}
          >
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div 
                className={`absolute top-4 w-full h-0.5 ${
                  index < currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                style={{ left: '50%', zIndex: 0 }}
              />
            )}
            
            {/* Step circle */}
            <div 
              className={`
                w-8 h-8 rounded-full flex items-center justify-center z-10 border-2
                ${index < currentStep 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : index === currentStep 
                    ? 'bg-white border-blue-500 text-blue-500' 
                    : 'bg-white border-gray-300 text-gray-400'}
              `}
            >
              {index < currentStep ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm">{index + 1}</span>
              )}
            </div>
            
            {/* Step label */}
            <div 
              className={`
                mt-2 text-sm font-medium
                ${index <= currentStep ? 'text-gray-800' : 'text-gray-400'}
              `}
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>
      
      {/* Mobile progress view */}
      <div className="sm:hidden">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-800">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium text-gray-800">
            {steps[currentStep].label}
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default BookingProgress;