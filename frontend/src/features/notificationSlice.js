import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";



const initialState = {
  notifications: [],
  isLoading: false,
};

const isNotificationUnread = (notification) =>
  notification?.read === false || notification?.read === undefined || notification?.unread === true;

const markRead = (notification) =>
  notification && typeof notification === "object" ? { ...notification, read: true, unread: false } : notification;

export const createNotification = createAsyncThunk(
  "notification/createNotification",
  async (Notification, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "notification/createNotification",
        Notification,
        { withCredentials: true }
      );
      return response.data.notification; 
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification creation failed"
      );
    }
  }
);


export const getAllNotifications = createAsyncThunk(
  "notification/allNotification",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("notification/allNotification", {
        withCredentials: true,
      });
      return response.data; 
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification retrieval failed"
      );
    }
  }
);


export const deleteNotification = createAsyncThunk(
  "notification/deleteNotification",
  async (NotificationId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(
        `notification/deleteNotification/${NotificationId}`,
        { withCredentials: true }
      );
      return NotificationId; 
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification removal failed"
      );
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  "notification/markNotificationAsRead",
  async (NotificationId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `notification/${NotificationId}/readNotification`,
        {},
        { withCredentials: true }
      );
      return response.data.notification;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification update failed"
      );
    }
  }
);


const notificationSlice = createSlice({
  name: "notification",
  initialState: initialState,
  reducers: {
    markAllNotificationsRead: (state) => {
      state.notifications = state.notifications.map(markRead);
    },
    clearUnreadNotifications: (state) => {
      state.notifications = state.notifications.map((notification) =>
        isNotificationUnread(notification) ? markRead(notification) : notification
      );
    },
    markNotificationReadOptimistic: (state, action) => {
      state.notifications = state.notifications.map((notification) =>
        notification?._id === action.payload ? markRead(notification) : notification
      );
    },
  },
  extraReducers: (builder) => {
    builder
   
      .addCase(getAllNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload || [];
        toast.success("Notifications fetched successfully");
      })
      .addCase(getAllNotifications.rejected, (state, action) => {
        state.isLoading = false;
        toast.error(action.payload || "Error fetching notifications");
      })

    
      .addCase(createNotification.fulfilled, (state, action) => {
       
        toast.success("Notification created successfully");
        state.notifications.unshift(action.payload);
      })
      .addCase(createNotification.rejected, (state, action) => {
        toast.error(action.payload || "Error creating notification");
      })

  
      .addCase(deleteNotification.fulfilled, (state, action) => {
        toast.success("Notification deleted successfully");
        state.notifications = state.notifications.filter(
          (notification) => notification._id !== action.payload
        );
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        toast.error(action.payload || "Error deleting notification");
      })

      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const updatedNotification = action.payload;
        const notificationId = updatedNotification?._id || action.meta.arg;
        state.notifications = state.notifications.map((notification) =>
          notification._id === notificationId ? markRead(updatedNotification ? { ...notification, ...updatedNotification } : notification) : notification
        );
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        toast.error(action.payload || "Error updating notification");
      });
  },
});

export default notificationSlice.reducer;
export const { clearUnreadNotifications, markAllNotificationsRead, markNotificationReadOptimistic } = notificationSlice.actions;


