import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext(undefined);

export const UIProvider = ({ children }) => {
  // UI state filters
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [selectedArea, setSelectedArea] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Global async action spinner (for booking/admin/provider actions)
  const [actionSpinner, setActionSpinner] = useState({ isOpen: false, message: '' });

  const setCity = (city) => {
    setSelectedCity(city);
    setSelectedArea('');
  };

  const setArea = (area) => {
    setSelectedArea(area);
  };

  const setCategory = (cat) => {
    setSelectedCategory(cat);
  };

  const runWithActionSpinner = async (asyncFn, { message = 'Processing...' } = {}) => {
    setActionSpinner({ isOpen: true, message });
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setActionSpinner({ isOpen: false, message: '' });
    }
  };

  return (
    <UIContext.Provider value={{
      selectedCity,
      selectedArea,
      searchQuery,
      selectedCategory,
      actionSpinner,
      setCity,
      setArea,
      setSearchQuery,
      setCategory,
      runWithActionSpinner
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used inside an UIProvider');
  }
  return context;
};
