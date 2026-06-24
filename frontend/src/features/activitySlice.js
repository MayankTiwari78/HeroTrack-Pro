import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback;

const initialState = {
  activityLogs: [],
  error: null,
  isAdding: false,
  isFetching: false,
  recentuser: [],
  userdata: [],
};

export const getAllActivityLogs = createAsyncThunk(
  "activitylogs/getAllLogs",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("activitylogs/getAllLogs", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch activity logs"));
    }
  }
);

export const getsingleUserActivityLogs = createAsyncThunk(
  "activitylogs/getLogs",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`activitylogs/getLogs/${userId}`, { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch activity logs"));
    }
  }
);

export const getrecentActivityLogs = createAsyncThunk(
  "activitylogs/getrecentActivitys",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("activitylogs/getrecentActivitys", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to fetch activity logs"));
    }
  }
);

export const addActivityLog = createAsyncThunk(
  "activitylogs/addLog",
  async (logData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("activitylogs/addLog", logData, { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to add activity log"));
    }
  }
);

const prependUniqueLog = (logs, incomingLog) => {
  if (!incomingLog) return logs;
  return [incomingLog, ...logs.filter((log) => log._id !== incomingLog._id)];
};

const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    activityLogReceived: (state, action) => {
      state.activityLogs = prependUniqueLog(state.activityLogs, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllActivityLogs.pending, (state) => {
        state.error = null;
        state.isFetching = true;
      })
      .addCase(getAllActivityLogs.fulfilled, (state, action) => {
        state.activityLogs = Array.isArray(action.payload) ? action.payload : [];
        state.isFetching = false;
      })
      .addCase(getAllActivityLogs.rejected, (state, action) => {
        state.error = action.payload;
        state.isFetching = false;
      })
      .addCase(addActivityLog.pending, (state) => {
        state.error = null;
        state.isAdding = true;
      })
      .addCase(addActivityLog.fulfilled, (state, action) => {
        state.activityLogs = prependUniqueLog(state.activityLogs, action.payload);
        state.isAdding = false;
      })
      .addCase(addActivityLog.rejected, (state, action) => {
        state.error = action.payload;
        state.isAdding = false;
      })
      .addCase(getsingleUserActivityLogs.fulfilled, (state, action) => {
        state.userdata = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getsingleUserActivityLogs.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(getrecentActivityLogs.fulfilled, (state, action) => {
        state.recentuser = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getrecentActivityLogs.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { activityLogReceived } = activitySlice.actions;
export default activitySlice.reducer;
