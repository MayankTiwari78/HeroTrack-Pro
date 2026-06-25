import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Building2,
  CalendarClock,
  ChevronDown,
  CheckCheck,
  CheckCircle,
  Clock,
  Download,
  Factory,
  Filter,
  Hash,
  Inbox,
  Package,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { addDays, format, formatDistanceToNow, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import toast from "react-hot-toast";
import {
  clearUnreadNotifications,
  createNotification,
  deleteNotification,
  getAllNotifications,
  markAllNotificationsRead,
  markNotificationAsRead,
  markNotificationReadOptimistic,
} from "../features/notificationSlice";
import { DoughnutVisual } from "../lib/EnterpriseCharts";
import socket from "../lib/socket";

const allowedFilters = ["all", "unread", "approved", "pending", "verification"];
const browserNotificationBlockedToastId = "hero-browser-notification-blocked";
const browserNotificationStatusToastId = "hero-browser-notification-status";
const browserNotificationBlockedMessage =
  "Notifications are blocked in browser settings. Please allow notifications from site settings.";

const statConfig = [
  { label: "Total Notifications", value: "all", icon: Bell, tone: "blue" },
  { label: "Unread", value: "unread", icon: BellRing, tone: "red" },
  { label: "Approved", value: "approved", icon: CheckCircle, tone: "green" },
  { label: "Pending", value: "pending", icon: Clock, tone: "amber" },
  { label: "Verification", value: "verification", icon: ShieldCheck, tone: "violet" },
];

const categoryTabs = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Approved", value: "approved" },
  { label: "Pending", value: "pending" },
  { label: "Verification", value: "verification" },
  { label: "Inventory", value: "inventory" },
];

const dropdownFilters = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Approved", value: "approved" },
  { label: "Pending", value: "pending" },
  { label: "Verification", value: "verification" },
];

const kindMeta = {
  approved: { label: "Approved", icon: CheckCircle, tone: "approved" },
  pending: { label: "Pending", icon: Clock, tone: "pending" },
  inventory: { label: "Inventory", icon: Package, tone: "inventory" },
  verification: { label: "Verification", icon: ShieldCheck, tone: "verification" },
  rejected: { label: "Rejected", icon: XCircle, tone: "rejected" },
  alert: { label: "Alert", icon: AlertTriangle, tone: "alert" },
  system: { label: "System", icon: Bell, tone: "system" },
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const titleCase = (value) =>
  String(value || "System")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getObjectLabel = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value.name || value.departmentName || value.plantName || value.code || value.title || value._id || "";
};

const getNotificationDate = (notification) => {
  const date = new Date(notification?.createdAt || notification?.updatedAt || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getRequestId = (notification) => {
  const directValue =
    notification?.requestId ||
    notification?.requestCode ||
    notification?.referenceNumber ||
    notification?.transactionCode ||
    notification?.relatedEntityId;
  const titleValue = `${notification?.name || ""} ${notification?.title || ""}`.match(
    /\b(?:HTP|REQ|APR|MOV|INV|PO|SR)-[A-Z0-9-]+\b/i
  );

  if (directValue) return String(directValue).toUpperCase();
  if (titleValue?.[0]) return titleValue[0].toUpperCase();
  if (notification?._id) return `NTF-${String(notification._id).slice(-6).toUpperCase()}`;
  return "NTF-PENDING";
};

const getDepartmentName = (notification) =>
  getObjectLabel(
    notification?.department ||
      notification?.departmentName ||
      notification?.requestDepartment ||
      notification?.toDepartment ||
      notification?.fromDepartment
  ) || "Plant Operations";

const getPlantName = (notification) => getObjectLabel(notification?.plant || notification?.plantName) || "Plant A";

const getNotificationKind = (notification) => {
  const haystack = normalizeText(
    `${notification?.status || ""} ${notification?.type || ""} ${notification?.name || ""} ${
      notification?.title || ""
    } ${notification?.description || ""} ${notification?.relatedEntity || ""}`
  );

  if (haystack.includes("reject") || haystack.includes("declined") || haystack.includes("failed")) return "rejected";
  if (haystack.includes("verification") || haystack.includes("verify") || haystack.includes("otp")) return "verification";
  if (haystack.includes("approved") || haystack.includes("approve_success")) return "approved";
  if (haystack.includes("pending") || haystack.includes("required") || haystack.includes("waiting")) return "pending";
  if (haystack.includes("low_stock") || haystack.includes("critical") || haystack.includes("alert") || haystack.includes("warning")) {
    return "alert";
  }
  if (
    haystack.includes("inventory") ||
    haystack.includes("stock") ||
    haystack.includes("spare") ||
    haystack.includes("movement") ||
    haystack.includes("part")
  ) {
    return "inventory";
  }
  return "system";
};

const getDescription = (notification, kind) => {
  const explicitDescription = notification?.description || notification?.message || notification?.details;
  if (explicitDescription) return explicitDescription;

  const typeValue = String(notification?.type || "").trim();
  if (typeValue && !typeValue.includes("_")) return typeValue;

  return `${titleCase(kindMeta[kind]?.label || kind)} notification recorded in the HeroTrack Pro workflow.`;
};

const getPercent = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

const escapeCsvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const isUnread = (notification) => notification?.read === false || notification?.read === undefined;

const notificationMatchesFilter = (notification, filter) => {
  if (filter === "all") return true;
  if (filter === "unread") return notification.unread;
  if (filter === "inventory") return notification.kind === "inventory" || notification.kind === "alert";
  return notification.kind === filter;
};

const isWithinTimeFilter = (date, filter) => {
  if (filter === "all") return true;
  if (!date) return false;

  const now = new Date();
  if (filter === "today") return date >= startOfDay(now);
  if (filter === "week") return date >= startOfWeek(now, { weekStartsOn: 1 });
  if (filter === "month") return date >= startOfMonth(now);
  return true;
};

const getBrowserNotificationSettingsUrl = () => {
  if (typeof window === "undefined") return "";

  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("edg/")) return "edge://settings/content/notifications";
  if (userAgent.includes("firefox/")) return "about:preferences#privacy";
  if (userAgent.includes("chrome/") || userAgent.includes("chromium/")) return "chrome://settings/content/notifications";

  return "";
};

const openBrowserNotificationSettings = () => {
  const settingsUrl = getBrowserNotificationSettingsUrl();
  if (!settingsUrl) return false;

  const settingsWindow = window.open(settingsUrl, "_blank");
  if (!settingsWindow) return false;

  settingsWindow.opener = null;
  settingsWindow.focus();
  return true;
};

const showBrowserNotificationBlockedToast = () => {
  toast.custom(
    (toastItem) => {
      const settingsUrl = getBrowserNotificationSettingsUrl();

      return (
        <div className={`notification-toast permission-warning ${toastItem.visible ? "show" : ""}`}>
          <BellRing size={20} />
          <div>
            <strong>Notifications blocked</strong>
            <span>{browserNotificationBlockedMessage}</span>
            {settingsUrl && (
              <div className="notification-toast-actions">
                <button
                  type="button"
                  className="notification-toast-action"
                  onClick={() => {
                    openBrowserNotificationSettings();
                    toast.dismiss(toastItem.id);
                  }}
                >
                  <Settings size={15} />
                  <span>Open Browser Settings</span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="notification-toast-dismiss"
            onClick={() => toast.dismiss(toastItem.id)}
            aria-label="Dismiss notification permission message"
          >
            <X size={16} />
          </button>
        </div>
      );
    },
    { id: browserNotificationBlockedToastId, duration: 8000, position: "top-right" }
  );
};

function MiniTrend({ values }) {
  const maxValue = Math.max(...values, 1);

  return (
    <div className="notification-sparkline" aria-hidden="true">
      {values.map((value, index) => (
        <i key={`${value}-${index}`} style={{ height: `${Math.max(18, (value / maxValue) * 100)}%` }} />
      ))}
    </div>
  );
}

function NotificationFilterDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0
  );
  const selectedOption = options[selectedIndex] || options[0];
  const listboxId = "notification-filter-listbox";

  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  const updateMenuPosition = () => {
    if (typeof window === "undefined" || !dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = rect.width;
    const left = Math.min(Math.max(rect.left, viewportPadding), Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding));

    setMenuStyle({
      position: "fixed",
      top: `${rect.bottom + 8}px`,
      left: `${left}px`,
      right: "auto",
      width: `${menuWidth}px`,
      zIndex: 99999,
      pointerEvents: "auto",
    });
  };

  const openDropdown = () => {
    updateMenuPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (dropdownRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const queueFocus = (callback) => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(callback);
      return;
    }
    callback();
  };

  const focusOption = (index) => {
    queueFocus(() => optionRefs.current[index]?.focus());
  };

  const closeDropdown = () => {
    setOpen(false);
    queueFocus(() => triggerRef.current?.focus());
  };

  const moveHighlight = (index) => {
    if (options.length === 0) return;
    const nextIndex = (index + options.length) % options.length;
    setActiveIndex(nextIndex);
    openDropdown();
    focusOption(nextIndex);
  };

  const commitOption = (option) => {
    if (!option) return;
    onChange(option.value);
    closeDropdown();
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(open ? activeIndex + 1 : selectedIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(open ? activeIndex - 1 : selectedIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        commitOption(options[activeIndex] || selectedOption);
        return;
      }
      openDropdown();
      setActiveIndex(selectedIndex);
      focusOption(selectedIndex);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const handleOptionKeyDown = (event, index) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(index + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(index - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveHighlight(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      moveHighlight(options.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commitOption(options[index]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      return;
    }

    if (event.key === "Tab") setOpen(false);
  };

  const menuMarkup = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          id={listboxId}
          className="notification-filter-menu notification-filter-menu-portal"
          role="listbox"
          aria-label="Notification filter options"
          style={menuStyle || undefined}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                id={`${listboxId}-${option.value}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`notification-filter-option ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`}
                onClick={() => commitOption(option)}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                <span>{option.label}</span>
                {isSelected && <CheckCircle size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="notification-select-shell notification-filter-dropdown" ref={dropdownRef}>
      <Filter size={17} />
      <button
        ref={triggerRef}
        type="button"
        className={`notification-filter-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="Notification filter"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          openDropdown();
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {typeof document !== "undefined" && document.body ? createPortal(menuMarkup, document.body) : menuMarkup}
    </div>
  );
}

function NotificationSettingsModal({
  open,
  onClose,
  desktopAlerts,
  setDesktopAlerts,
  digestEnabled,
  setDigestEnabled,
  criticalAlerts,
  setCriticalAlerts,
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="notification-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="notification-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-settings-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="notification-modal-header">
              <div>
                <span>Notification Preferences</span>
                <strong id="notification-settings-title">Alert Routing</strong>
              </div>
              <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close notification settings">
                <X size={18} />
              </button>
            </div>

            <div className="notification-settings-card notification-settings-modal-body">
              <label>
                <span>Desktop alerts</span>
                <input type="checkbox" checked={desktopAlerts} onChange={(event) => setDesktopAlerts(event.target.checked)} />
              </label>
              <label>
                <span>Approval digest</span>
                <input type="checkbox" checked={digestEnabled} onChange={(event) => setDigestEnabled(event.target.checked)} />
              </label>
              <label>
                <span>Critical inventory</span>
                <input type="checkbox" checked={criticalAlerts} onChange={(event) => setCriticalAlerts(event.target.checked)} />
              </label>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotificationDashboard({ canManage = false }) {
  const dispatch = useDispatch();
  const { notifications, isLoading } = useSelector((state) => state.notification);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [dropdownFilter, setDropdownFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [desktopAlerts, setDesktopAlerts] = useState(() => localStorage.getItem("hero-notification-desktop") !== "off");
  const [digestEnabled, setDigestEnabled] = useState(() => localStorage.getItem("hero-notification-digest") !== "off");
  const [criticalAlerts, setCriticalAlerts] = useState(() => localStorage.getItem("hero-notification-critical") !== "off");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("hero_notifications_enabled") === "true"
  );
  const [permission, setPermission] = useState(() =>
    typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported"
  );

  const notificationList = useMemo(() => (Array.isArray(notifications) ? notifications : []), [notifications]);

  useEffect(() => {
    dispatch(getAllNotifications());

    const handleNotification = (newNotification) => {
      toast.custom(
        (toastItem) => (
          <div className={`notification-toast ${toastItem.visible ? "show" : ""}`}>
            <BellRing size={20} />
            <div>
              <strong>{newNotification?.name || "New notification"}</strong>
              <span>{titleCase(newNotification?.type || "system")}</span>
            </div>
            <button type="button" onClick={() => toast.dismiss(toastItem.id)} aria-label="Dismiss notification toast">
              <X size={16} />
            </button>
          </div>
        ),
        { duration: 4000, position: "top-right" }
      );
      dispatch(getAllNotifications());
    };

    socket.on("newNotification", handleNotification);

    return () => {
      socket.off("newNotification", handleNotification);
    };
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      setPermission("unsupported");
      setNotificationsEnabled(false);
      window.localStorage.setItem("hero_notifications_enabled", "false");
      return;
    }

    const currentPermission = window.Notification.permission;
    setPermission(currentPermission);

    if (currentPermission !== "granted" && window.localStorage.getItem("hero_notifications_enabled") === "true") {
      setNotificationsEnabled(false);
      window.localStorage.setItem("hero_notifications_enabled", "false");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("hero-notification-desktop", desktopAlerts ? "on" : "off");
  }, [desktopAlerts]);

  useEffect(() => {
    localStorage.setItem("hero-notification-digest", digestEnabled ? "on" : "off");
  }, [digestEnabled]);

  useEffect(() => {
    localStorage.setItem("hero-notification-critical", criticalAlerts ? "on" : "off");
  }, [criticalAlerts]);

  const enrichedNotifications = useMemo(
    () =>
      notificationList.map((notification, index) => {
        const kind = getNotificationKind(notification);
        const date = getNotificationDate(notification);
        const title = notification.title || notification.name || "HeroTrack notification";
        const requestId = getRequestId(notification);
        const department = getDepartmentName(notification);
        const plant = getPlantName(notification);
        const description = getDescription(notification, kind);

        return {
          ...notification,
          key: notification._id || `${requestId}-${index}`,
          date,
          department,
          description,
          kind,
          plant,
          requestId,
          title,
          typeLabel: titleCase(notification.type || kind),
          unread: isUnread(notification),
        };
      }),
    [notificationList]
  );

  const stats = useMemo(() => {
    const result = enrichedNotifications.reduce(
      (totals, notification) => {
        totals.total += 1;
        if (notification.unread) totals.unread += 1;
        if (notification.kind === "approved") totals.approved += 1;
        if (notification.kind === "pending") totals.pending += 1;
        if (notification.kind === "verification") totals.verification += 1;
        if (notification.kind === "inventory" || notification.kind === "alert") totals.inventory += 1;
        return totals;
      },
      { total: 0, unread: 0, approved: 0, pending: 0, verification: 0, inventory: 0 }
    );

    return {
      ...result,
      all: result.total,
      approvedPercent: getPercent(result.approved, result.total),
      pendingPercent: getPercent(result.pending, result.total),
      unreadPercent: getPercent(result.unread, result.total),
      verificationPercent: getPercent(result.verification, result.total),
    };
  }, [enrichedNotifications]);

  const trendByFilter = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, index) => subDays(today, 6 - index));

    return statConfig.reduce((result, card) => {
      result[card.value] = days.map((day) => {
        const nextDay = addDays(day, 1);
        return enrichedNotifications.filter(
          (notification) =>
            notification.date &&
            notification.date >= day &&
            notification.date < nextDay &&
            notificationMatchesFilter(notification, card.value)
        ).length;
      });
      return result;
    }, {});
  }, [enrichedNotifications]);

  const visibleFilter = activeTab === "inventory" ? "inventory" : activeFilter;

  const filteredNotifications = useMemo(() => {
    const query = normalizeText(searchTerm);

    return enrichedNotifications.filter((notification) => {
      if (!notificationMatchesFilter(notification, visibleFilter)) return false;
      if (!isWithinTimeFilter(notification.date, timeFilter)) return false;

      if (!query) return true;
      const searchableText = normalizeText(
        `${notification.requestId} ${notification.title} ${notification.description} ${notification.department} ${notification.plant} ${notification.typeLabel}`
      );
      return searchableText.includes(query);
    });
  }, [enrichedNotifications, searchTerm, timeFilter, visibleFilter]);

  const tabCounts = useMemo(
    () =>
      categoryTabs.reduce((counts, tab) => {
        counts[tab.value] = enrichedNotifications.filter((notification) =>
          notificationMatchesFilter(notification, tab.value)
        ).length;
        return counts;
      }, {}),
    [enrichedNotifications]
  );

  const setFilter = (filter) => {
    if (allowedFilters.includes(filter)) {
      setActiveFilter(filter);
    }
    setActiveTab(filter);
    setDropdownFilter("all");
    setTimeFilter("all");
  };

  const handleDropdownFilter = (value) => {
    setDropdownFilter(value);

    if (allowedFilters.includes(value) && value !== "all") {
      setActiveFilter(value);
      setActiveTab(value);
      setTimeFilter("all");
      return;
    }

    if (value === "all") {
      setActiveFilter("all");
      setActiveTab("all");
      setTimeFilter("all");
      return;
    }

    setTimeFilter(value);
  };

  const resetForm = () => {
    setName("");
    setType("");
  };

  const submitNotification = async (event) => {
    event.preventDefault();
    try {
      await dispatch(createNotification({ name, type })).unwrap();
      resetForm();
      setIsFormVisible(false);
    } catch (error) {
      toast.error(error || "Failed to add notification");
    }
  };

  const markUnreadNotificationsRead = async (successMessage, optimisticAction = markAllNotificationsRead) => {
    const unreadNotifications = enrichedNotifications.filter((notification) => notification.unread);

    if (unreadNotifications.length === 0) {
      toast.success("No unread notifications remain.");
      return;
    }

    dispatch(optimisticAction());
    const unreadNotificationIds = unreadNotifications.map((notification) => notification._id).filter(Boolean);

    if (unreadNotificationIds.length === 0) {
      toast.success(successMessage);
      return;
    }

    try {
      await Promise.all(unreadNotificationIds.map((notificationId) => dispatch(markNotificationAsRead(notificationId)).unwrap()));
      toast.success(successMessage);
    } catch (error) {
      toast.error(error || "Unable to update unread notifications.");
      dispatch(getAllNotifications());
    }
  };

  const handleExport = () => {
    const headers = ["Request ID", "Title", "Description", "Department", "Plant", "Status", "Read State", "Created At"];
    const exportRows = filteredNotifications.map((notification) => ({
      "Request ID": notification.requestId,
      Title: notification.title,
      Description: notification.description,
      Department: notification.department,
      Plant: notification.plant,
      Status: kindMeta[notification.kind]?.label || titleCase(notification.kind),
      "Read State": notification.unread ? "Unread" : "Read",
      "Created At": notification.date ? notification.date.toISOString() : "",
    }));
    const csv = [
      headers.map(escapeCsvCell).join(","),
      ...exportRows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hero-notifications-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Notifications exported.");
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined") {
      toast.error("Desktop notifications are not supported in this browser.", { id: browserNotificationStatusToastId });
      setPermission("unsupported");
      setNotificationsEnabled(false);
      return;
    }

    if (!("Notification" in window)) {
      toast.error("Desktop notifications are not supported in this browser.", { id: browserNotificationStatusToastId });
      setPermission("unsupported");
      setNotificationsEnabled(false);
      window.localStorage.setItem("hero_notifications_enabled", "false");
      return;
    }

    if (window.Notification.permission === "denied") {
      setPermission("denied");
      setNotificationsEnabled(false);
      window.localStorage.setItem("hero_notifications_enabled", "false");
      showBrowserNotificationBlockedToast();
      return;
    }

    try {
      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission === "granted") {
        setNotificationsEnabled(true);
        window.localStorage.setItem("hero_notifications_enabled", "true");
        toast.success("Browser notifications enabled successfully.", { id: browserNotificationStatusToastId });
        return;
      }

      setNotificationsEnabled(false);
      window.localStorage.setItem("hero_notifications_enabled", "false");
      if (nextPermission === "denied") {
        showBrowserNotificationBlockedToast();
        return;
      }

      toast.error("Notification permission was not enabled.", { id: browserNotificationStatusToastId });
    } catch (error) {
      setNotificationsEnabled(false);
      window.localStorage.setItem("hero_notifications_enabled", "false");
      if (window.Notification.permission === "denied") {
        setPermission("denied");
        showBrowserNotificationBlockedToast();
        return;
      }

      toast.error(error?.message || "Unable to request notification permission.", { id: browserNotificationStatusToastId });
    }
  };

  return (
    <section className="enterprise-page notification-page">
      <div className="page-heading notification-heading">
        <div>
          <p className="eyebrow">Enterprise Notification Center</p>
          <h1>HeroTrack Pro Notifications</h1>
          <span>Real-time spare-parts alerts, approval updates, verification events and plant workflow signals.</span>
        </div>
        <div className="heading-actions">
          <span className="status-pill">{filteredNotifications.length} visible</span>
          {canManage && (
            <button className="notification-primary-action" type="button" onClick={() => setIsFormVisible((value) => !value)}>
              {isFormVisible ? <X size={17} /> : <Plus size={17} />}
              <span>{isFormVisible ? "Close" : "Add Notification"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="notification-stat-grid">
        {statConfig.map(({ label, value, icon: Icon, tone }) => {
          const count = stats[value] || 0;
          const isActive = activeFilter === value && activeTab !== "inventory";
          const percentage = value === "all" ? getPercent(count, stats.total) : getPercent(count, stats.total);

          return (
            <motion.button
              type="button"
              key={value}
              className={`notification-stat-card ${tone} ${isActive ? "active" : ""}`}
              onClick={() => setFilter(value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isActive}
            >
              <span className="notification-stat-icon">
                <Icon size={22} />
              </span>
              <span className="notification-stat-copy">
                <span>{label}</span>
                <strong>{isLoading ? "..." : count}</strong>
                <small>{percentage}% of notification stream</small>
              </span>
              <MiniTrend values={trendByFilter[value] || []} />
            </motion.button>
          );
        })}
      </div>

      <div className="notification-layout">
        <aside className="notification-control-panel">
          <div className="notification-panel-block">
            <div className="notification-panel-title">
              <Filter size={17} />
              <span>Filters</span>
            </div>

            <label className="notification-search-shell">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search request, title, department"
              />
            </label>

            <NotificationFilterDropdown value={dropdownFilter} options={dropdownFilters} onChange={handleDropdownFilter} />
          </div>

          <div className="notification-panel-block">
            <div className="notification-panel-title">
              <Radio size={17} />
              <span>Categories</span>
            </div>
            <div className="notification-tab-list">
              {categoryTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.value}
                  className={`notification-tab ${activeTab === tab.value ? "active" : ""}`}
                  onClick={() => setFilter(tab.value)}
                >
                  <span>{tab.label}</span>
                  <strong>{tabCounts[tab.value] || 0}</strong>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {canManage && isFormVisible && (
              <motion.div
                className="notification-panel-block notification-create-panel"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
              >
                <div className="notification-panel-title">
                  <Plus size={17} />
                  <span>Add Notification</span>
                </div>
                <form onSubmit={submitNotification} className="notification-create-form">
                  <label>
                    <span>Title</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Approval update" />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                      required
                      placeholder="Department request or inventory alert"
                    />
                  </label>
                  <button type="submit" className="notification-primary-action">
                    <Plus size={17} />
                    <span>Add Notification</span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        <main className="notification-feed-panel">
          <div className="notification-feed-header">
            <div>
              <span>Notification Feed</span>
              <strong>{isLoading ? "Syncing..." : `${filteredNotifications.length} records`}</strong>
            </div>
            <span className="notification-live-pill">
              <Radio size={14} />
              Live socket
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => {
                const meta = kindMeta[notification.kind] || kindMeta.system;
                const Icon = meta.icon;

                return (
                  <motion.article
                    layout
                    key={notification.key}
                    className={`notification-card ${meta.tone} ${notification.unread ? "unread" : "read"}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="notification-card-icon">
                      <Icon size={22} />
                    </div>

                    <div className="notification-card-body">
                      <div className="notification-card-topline">
                        <span className={`notification-status-badge ${meta.tone}`}>{meta.label}</span>
                        <span className={`notification-read-indicator ${notification.unread ? "unread" : "read"}`}>
                          {notification.unread ? "Unread" : "Read"}
                        </span>
                      </div>

                      <h2>{notification.title}</h2>
                      <p>{notification.description}</p>

                      <div className="notification-meta-grid">
                        <span>
                          <Building2 size={14} />
                          {notification.department}
                        </span>
                        <span>
                          <Factory size={14} />
                          {notification.plant}
                        </span>
                        <span>
                          <Hash size={14} />
                          {notification.requestId}
                        </span>
                        <span>
                          <CalendarClock size={14} />
                          {notification.date ? formatDistanceToNow(notification.date, { addSuffix: true }) : "Time unavailable"}
                        </span>
                      </div>

                      <div className="notification-card-footer">
                        <span>{notification.date ? format(notification.date, "dd MMM yyyy, hh:mm a") : "Timestamp unavailable"}</span>
                        <div className="notification-card-actions">
                          {notification.unread && notification._id && (
                            <button
                              type="button"
                              onClick={() => {
                                dispatch(markNotificationReadOptimistic(notification._id));
                                dispatch(markNotificationAsRead(notification._id));
                              }}
                              title="Mark as read"
                              aria-label="Mark notification as read"
                            >
                              <CheckCheck size={16} />
                            </button>
                          )}
                          {canManage && notification._id && (
                            <button
                              type="button"
                              className="danger"
                              onClick={() => dispatch(deleteNotification(notification._id))}
                              title="Delete notification"
                              aria-label="Delete notification"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })
            ) : (
              <motion.div
                className="notification-empty-state"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
              >
                <span>
                  <Inbox size={42} />
                </span>
                <strong>You're all caught up.</strong>
                <p>{isLoading ? "Loading notifications..." : "No notifications match the current filters."}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <aside className="notification-insights-panel">
          <section className="notification-side-card">
            <div className="notification-side-card-header">
              <div>
                <span>Notification Insights</span>
                <strong>Workflow Split</strong>
              </div>
              <ShieldCheck size={18} />
            </div>
            <DoughnutVisual
              labels={["Approved", "Pending", "Verification"]}
              values={[stats.approved, stats.pending, stats.verification]}
              label="Notification mix"
            />
            <div className="notification-insight-list">
              <div>
                <span>Approved</span>
                <strong>{stats.approvedPercent}%</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{stats.pendingPercent}%</strong>
              </div>
              <div>
                <span>Verification</span>
                <strong>{stats.verificationPercent}%</strong>
              </div>
            </div>
          </section>

          <section className="notification-side-card">
            <div className="notification-side-card-header">
              <div>
                <span>Quick Actions</span>
                <strong>Notification Ops</strong>
              </div>
              <Settings size={18} />
            </div>
            <div className="notification-action-grid">
              <button type="button" onClick={() => markUnreadNotificationsRead("All unread notifications marked as read.")}>
                <CheckCheck size={17} />
                <span>Mark all as read</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await markUnreadNotificationsRead("Unread queue cleared.", clearUnreadNotifications);
                  setFilter("all");
                }}
              >
                <Bell size={17} />
                <span>Clear unread</span>
              </button>
              <button type="button" onClick={handleExport}>
                <Download size={17} />
                <span>Export notifications</span>
              </button>
              <button type="button" onClick={() => setSettingsOpen(true)}>
                <Settings size={17} />
                <span>Open settings</span>
              </button>
            </div>
          </section>

          <motion.section
            className={`notification-enable-card ${notificationsEnabled ? "enabled" : ""}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>
              <BellRing size={24} />
            </span>
            <div>
              <strong>{notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}</strong>
              <p>{notificationsEnabled && permission === "granted" ? "Desktop alerts are active." : "Turn on browser alerts for critical plant updates."}</p>
            </div>
            <button type="button" onClick={requestNotificationPermission}>
              <BellRing size={17} />
              <span>{notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}</span>
            </button>
          </motion.section>
        </aside>
      </div>

      <NotificationSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        desktopAlerts={desktopAlerts}
        setDesktopAlerts={setDesktopAlerts}
        digestEnabled={digestEnabled}
        setDigestEnabled={setDigestEnabled}
        criticalAlerts={criticalAlerts}
        setCriticalAlerts={setCriticalAlerts}
      />
    </section>
  );
}

export default NotificationDashboard;
