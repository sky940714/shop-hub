// src/pages/checkout/components/StepIndicator.tsx
import React from 'react';
import '../styles/StepIndicator.css';

interface StepIndicatorProps {
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: '收件資訊' },
    { number: 2, label: '配送方式' },
    { number: 3, label: '付款方式' },
    { number: 4, label: '確認訂單' },
  ];

  return (
    <div className="steps-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div
            className={`step ${currentStep >= step.number ? 'active' : ''} ${
              currentStep > step.number ? 'completed' : ''
            }`}
          >
            <div className="step-number">{step.number}</div>
            <div className="step-label">{step.label}</div>
          </div>
          {index < steps.length - 1 && <div className="step-line"></div>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;