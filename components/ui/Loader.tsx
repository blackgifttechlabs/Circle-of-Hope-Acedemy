import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center w-full h-64">
      <svg className="loader-svg" viewBox="25 25 50 50">
        <circle className="loader-circle" r="20" cy="50" cx="50"></circle>
      </svg>
      <style>{`
        .loader-svg {
          width: 3.25em;
          transform-origin: center;
          animation: rotate4 2s linear infinite;
        }

        .loader-circle {
          fill: none;
          stroke: hsl(214, 97%, 59%);
          stroke-width: 2;
          stroke-dasharray: 1, 200;
          stroke-dashoffset: 0;
          stroke-linecap: round;
          animation: dash4 1.5s ease-in-out infinite;
        }

        @keyframes rotate4 {
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes dash4 {
          0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
          }

          50% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -35px;
          }

          100% {
            stroke-dashoffset: -125px;
          }
        }
      `}</style>
    </div>
  );
};