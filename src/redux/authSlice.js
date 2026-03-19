import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  session: null,
  status: 'loading', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload?.user || null;
      state.session = action.payload?.session || null;
      state.status = 'succeeded';
    },
    clearUser: (state) => {
      state.user = null;
      state.session = null;
      state.status = 'succeeded';
    },
    setAuthStatus: (state, action) => {
      state.status = action.payload;
    },
  },
});

export const { setUser, clearUser, setAuthStatus } = authSlice.actions;
export default authSlice.reducer;
