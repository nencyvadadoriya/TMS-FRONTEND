import { configureStore } from '@reduxjs/toolkit';

import { tasksReducer } from './tasksSlice';
import { usersReducer } from './usersSlice';
import { brandsReducer } from './brandsSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    users: usersReducer,
    brands: brandsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
