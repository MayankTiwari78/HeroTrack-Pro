import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

const getErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.response?.data?.error || fallback
);

const initialState = {
  Authuser: readStoredUser(),
  adminuser: null,
  error: null,
  isFetchingUserActivity: false,
  isUserLogin: false,
  isUserSignup: false,
  isupdateProfile: false,
  manageruser: null,
  staffuser: null,
  token: localStorage.getItem("token") || null,
  userActivityStatus: null,
};

export const signup = createAsyncThunk(
  "auth/signup",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("auth/signup", credentials, { withCredentials: true });
      localStorage.setItem("user", JSON.stringify(response.data.savedUser));
      localStorage.setItem("token", response.data.savedUser.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Signup failed"));
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("auth/login", credentials, { withCredentials: true });
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.user.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Login failed"));
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post("auth/logout", {}, { withCredentials: true });
      return null;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Logout failed"));
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("authUser");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (base64Image, { rejectWithValue }) => {
    try {
      const storedUser = readStoredUser();
      if (!storedUser) {
        return rejectWithValue("User not authenticated. Please log in again.");
      }

      const response = await axiosInstance.put(
        "auth/updateProfile",
        { ProfilePic: base64Image },
        { withCredentials: true }
      );
      const updatedUser = response.data?.updatedUser;

      if (!updatedUser) throw new Error("Unexpected response structure");
      const mergedUser = {
        ...storedUser,
        ...updatedUser,
        id: updatedUser?._id || updatedUser?.id || storedUser.id,
        token: storedUser.token || localStorage.getItem("token"),
      };
      localStorage.setItem("user", JSON.stringify(mergedUser));
      return mergedUser;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to update profile"));
    }
  }
);

export const staffUser = createAsyncThunk(
  "auth/staffuser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/staffuser", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to get staff users"));
    }
  }
);

export const managerUser = createAsyncThunk(
  "auth/manageruser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/manageruser", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to get manager users"));
    }
  }
);

export const adminUser = createAsyncThunk(
  "auth/adminuser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/adminuser", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to get admin users"));
    }
  }
);

export const removeusers = createAsyncThunk(
  "auth/removeuser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`auth/removeuser/${userId}`, { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to delete user"));
    }
  }
);

export const getUserActivityStatus = createAsyncThunk(
  "auth/userActivityStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/user-activity-status", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Failed to load user activity status"));
    }
  }
);

const clearSession = (state) => {
  state.Authuser = null;
  state.token = null;
  state.userActivityStatus = null;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.error = null;
        state.isUserSignup = true;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.Authuser = action.payload.savedUser;
        state.isUserSignup = false;
        state.token = action.payload.savedUser?.token || null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.error = action.payload;
        state.isUserSignup = false;
      })
      .addCase(login.pending, (state) => {
        state.error = null;
        state.isUserLogin = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.Authuser = action.payload.user;
        state.isUserLogin = false;
        state.token = action.payload.user?.token || null;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload;
        state.isUserLogin = false;
      })
      .addCase(logout.fulfilled, clearSession)
      .addCase(logout.rejected, (state, action) => {
        clearSession(state);
        state.error = action.payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.error = null;
        state.isupdateProfile = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.Authuser = {
          ...state.Authuser,
          ...action.payload,
          id: action.payload?._id || action.payload?.id || state.Authuser?.id,
        };
        state.isupdateProfile = false;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload;
        state.isupdateProfile = false;
      })
      .addCase(staffUser.fulfilled, (state, action) => {
        state.staffuser = action.payload;
      })
      .addCase(staffUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(managerUser.fulfilled, (state, action) => {
        state.manageruser = action.payload;
      })
      .addCase(managerUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(adminUser.fulfilled, (state, action) => {
        state.adminuser = action.payload;
      })
      .addCase(adminUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(removeusers.fulfilled, (state, action) => {
        if (state.userActivityStatus?.users) {
          state.userActivityStatus.users = state.userActivityStatus.users.filter(
            (user) => user._id !== action.payload.userId
          );
        }
      })
      .addCase(removeusers.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(getUserActivityStatus.pending, (state) => {
        state.error = null;
        state.isFetchingUserActivity = true;
      })
      .addCase(getUserActivityStatus.fulfilled, (state, action) => {
        state.isFetchingUserActivity = false;
        state.userActivityStatus = action.payload;
      })
      .addCase(getUserActivityStatus.rejected, (state, action) => {
        state.error = action.payload;
        state.isFetchingUserActivity = false;
      });
  },
});

export default authSlice.reducer;
