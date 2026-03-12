import React, { createContext, useContext, useState, useEffect } from 'react';

const FontSizeContext = createContext();

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    // Load from localStorage or default to 'medium'
    const saved = localStorage.getItem('fontSize');
    return saved || 'medium';
  });

  useEffect(() => {
    // Save to localStorage whenever fontSize changes
    localStorage.setItem('fontSize', fontSize);
    
    // Apply font size class to document root
    document.documentElement.className = document.documentElement.className
      .replace(/font-size-\w+/g, '');
    document.documentElement.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  const toggleFontSize = () => {
    const sizes = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSize(sizes[nextIndex]);
  };

  const setFontSizeValue = (size) => {
    if (['small', 'medium', 'large'].includes(size)) {
      setFontSize(size);
    }
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, toggleFontSize, setFontSize: setFontSizeValue }}>
      {children}
    </FontSizeContext.Provider>
  );
};

