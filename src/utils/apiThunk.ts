import { createAsyncThunk } from '@reduxjs/toolkit';
import axios, { AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { ApiResponse } from '../types/api';

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverError = error.response?.data?.error as string | undefined;
    if (serverError) return serverError;
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

export function extractApiData<T>(response: AxiosResponse<ApiResponse<T>>): T | null {
  const body = response.data;
  if (body.error) throw new Error(body.error);
  return body.data;
}

interface ApiThunkOptions<TResult, TPayload> {
  disableSuccessToast?: boolean;
  successMessage?: string;
  transformResponse?: (data: unknown, payload: TPayload) => TResult;
}

export function createApiThunk<TResult = unknown, TPayload = void>(
  typePrefix: string,
  requestHandler: (payload: TPayload) => Promise<AxiosResponse<ApiResponse>>,
  options: ApiThunkOptions<TResult, TPayload> = {},
) {
  return createAsyncThunk<TResult, TPayload>(
    typePrefix,
    async (payload, { rejectWithValue }) => {
      try {
        const response = await requestHandler(payload);
        const data = extractApiData(response);

        if (!options.disableSuccessToast && options.successMessage) {
          toast.success(options.successMessage);
        }

        if (options.transformResponse) {
          return options.transformResponse(data, payload);
        }

        return data as TResult;
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error(message);
        return rejectWithValue(message);
      }
    },
  );
}
