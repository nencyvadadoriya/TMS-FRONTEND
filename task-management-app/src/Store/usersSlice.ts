import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UserType } from '../Types/Types';
import { authService } from '../Services/User.Services';
import type { RootState } from './store';

const usersAdapter = createEntityAdapter<UserType>();

interface UsersState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState = usersAdapter.getInitialState<UsersState>({
  status: 'idle',
  error: null,
  lastFetchedAt: null,
});

const FETCH_TTL_MS = 60_000;

export const fetchUsers = createAsyncThunk<
  UserType[],
  { force?: boolean } | void,
  { state: RootState }
>(
  'users/fetchUsers',
  async (_arg) => {
    const response = await authService.getAllUsers();
    
    let rawUsers: any[] = [];
    if (Array.isArray(response)) {
      rawUsers = response;
    } else if (response && typeof response === 'object') {
      const data = (response as any).data || (response as any).result;
      if (Array.isArray(data)) rawUsers = data;
      else if ((response as any).success && Array.isArray((response as any).data)) rawUsers = (response as any).data;
    }

    return rawUsers.map((u: any) => {
      const id = (u?.id || u?._id || u?.userId || '').toString();
      return { ...u, id } as UserType;
    });
  },
  {
    condition: (arg, { getState }) => {
      const force = Boolean((arg as any)?.force);
      const state = getState();
      const users = state.users;

      if (force) return true;
      if (users.status === 'loading') return false;
      if (users.lastFetchedAt && Date.now() - users.lastFetchedAt < FETCH_TTL_MS) {
        return false;
      }
      return true;
    },
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    usersReset: (state) => {
      usersAdapter.removeAll(state);
      state.status = 'idle';
      state.error = null;
      state.lastFetchedAt = null;
    },
    userUpserted: (state, action: PayloadAction<UserType>) => {
      usersAdapter.upsertOne(state, action.payload);
    },
    userRemoved: (state, action: PayloadAction<string>) => {
      usersAdapter.removeOne(state, action.payload);
    },
    usersSetAll: (state, action: PayloadAction<UserType[]>) => {
      usersAdapter.setAll(state, action.payload);
      state.lastFetchedAt = Date.now();
    },
    userOnlineStatusChanged: (state, action: PayloadAction<{ userId: string; isOnline: boolean }>) => {
      const { userId, isOnline } = action.payload;
      usersAdapter.updateOne(state, {
        id: userId,
        changes: { isActive: isOnline } as any, // Using isActive as a proxy for online status if isOnline isn't in Type
      });
      // Note: If we want a separate 'isOnline' field, we'd need to update UserType. 
      // For now, many components use isActive.
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        usersAdapter.setAll(state, action.payload);
        state.status = 'succeeded';
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch users';
      });
  },
});

export const { usersReset, userUpserted, userRemoved, usersSetAll, userOnlineStatusChanged } = usersSlice.actions;

export const usersReducer = usersSlice.reducer;

const selectUsersState = (state: RootState) => state.users;

export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = usersAdapter.getSelectors(selectUsersState);

export const selectUsersStatus = (state: RootState) => state.users.status;
export const selectUsersError = (state: RootState) => state.users.error;
