import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
  </div>
);