const mongoose = require("mongoose");

const formSubmissionSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    formId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, default: "" },
    userAvatar: { type: String, default: null },
    answers: [
      {
        fieldId: { type: String, required: true },
        label: { type: String, required: true },
        value: { type: String, default: "" }
      }
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "refused"],
      default: "pending"
    },
    messageId: { type: String, default: null }, // ID du message envoyé dans le salon staff
    channelId: { type: String, default: null }, // Salon staff
    reviewedBy: { type: String, default: null },
    reviewedByName: { type: String, default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FormSubmission", formSubmissionSchema, "formsubmissions");
