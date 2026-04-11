import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Brand } from '../Types/Types';
import { brandService } from '../Services/Brand.service';
import type { RootState } from './store';

const brandsAdapter = createEntityAdapter<Brand>();

interface BrandsState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState = brandsAdapter.getInitialState<BrandsState>({
  status: 'idle',
  error: null,
  lastFetchedAt: null,
});

const FETCH_TTL_MS = 60_000;

export const fetchBrands = createAsyncThunk<
  Brand[],
  { force?: boolean } | void,
  { state: RootState }
>(
  'brands/fetchBrands',
  async (_arg) => {
    const response = await brandService.getBrands();
    
    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error((response as any)?.message || 'Failed to fetch brands');
    }

    return response.data.map((b: any) => {
      const id = (b?.id || b?._id || '').toString();
      return { ...b, id } as Brand;
    });
  },
  {
    condition: (arg, { getState }) => {
      const force = Boolean((arg as any)?.force);
      const state = getState();
      const brands = state.brands;

      if (force) return true;
      if (brands.status === 'loading') return false;
      if (brands.lastFetchedAt && Date.now() - brands.lastFetchedAt < FETCH_TTL_MS) {
        return false;
      }
      return true;
    },
  }
);

const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  reducers: {
    brandsReset: (state) => {
      brandsAdapter.removeAll(state);
      state.status = 'idle';
      state.error = null;
      state.lastFetchedAt = null;
    },
    brandUpserted: (state, action: PayloadAction<Brand>) => {
      brandsAdapter.upsertOne(state, action.payload);
    },
    brandRemoved: (state, action: PayloadAction<string>) => {
      brandsAdapter.removeOne(state, action.payload);
    },
    brandsSetAll: (state, action: PayloadAction<Brand[]>) => {
      brandsAdapter.setAll(state, action.payload);
      state.lastFetchedAt = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        brandsAdapter.setAll(state, action.payload);
        state.status = 'succeeded';
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch brands';
      });
  },
});

export const { brandsReset, brandUpserted, brandRemoved, brandsSetAll } = brandsSlice.actions;

export const brandsReducer = brandsSlice.reducer;

const selectBrandsState = (state: RootState) => state.brands;

export const {
  selectAll: selectAllBrands,
  selectById: selectBrandById,
  selectIds: selectBrandIds,
} = brandsAdapter.getSelectors(selectBrandsState);

export const selectBrandsStatus = (state: RootState) => state.brands.status;
export const selectBrandsError = (state: RootState) => state.brands.error;
