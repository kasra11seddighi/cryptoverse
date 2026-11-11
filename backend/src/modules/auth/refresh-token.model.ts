// Defines the MongoDB model for securely stored refresh token sessions.

import { Schema, model, Types } from "mongoose";

// Defines the structure of a refresh token session.
export interface IRefreshToken {
  userId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Defines database validation and automatic expiration behavior.
const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Creates the refresh token model.
const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);

export default RefreshToken;
