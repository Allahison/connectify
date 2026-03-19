import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: localStorage.getItem('theme') || 'light',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      if (action.payload === 'light') {
         document.documentElement.className = '';
      } else {
         document.documentElement.className = `theme-${action.payload}`;
      }
    },
    initializeTheme: (state) => {
      if (state.theme === 'light') {
         document.documentElement.className = '';
      } else {
         document.documentElement.className = `theme-${state.theme}`;
      }
    }
  },
});

export const { setTheme, initializeTheme } = themeSlice.actions;
export default themeSlice.reducer;
