const mongoose = require("mongoose");
const logActivity = require("../libs/logger");

const NotificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedEntity: {
      type: String,
      trim: true,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

NotificationSchema.pre("save", function rememberNewState(next) {
  this.$locals.wasNew = this.isNew;
  next();
});

NotificationSchema.post("save", async function logNotification(document) {
  if (!document.$locals.wasNew) return;

  await logActivity({
    action: "NOTIFICATION_CREATE",
    description: `Notification created: ${document.name}`,
    module: "notifications",
    entity: "notification",
    entityId: document._id,
    userId: document.$locals?.auditUserId,
    ipAddress: document.$locals?.auditIpAddress,
    dedupeKey: `notification:create:${document._id}`,
  });
});

module.exports = mongoose.model("Notification", NotificationSchema);
