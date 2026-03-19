import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import authReducer from './authSlice';
import notificationReducer from './notificationSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    notifications: notificationReducer,
  },
});
