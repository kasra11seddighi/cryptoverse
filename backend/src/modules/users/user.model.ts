// Defines the User schema and MongoDB model for CryptoVerse.

import { Schema, model } from "mongoose";

// Defines the allowed roles for application users.
export type UserRole = "user" | "admin";

// Defines the structure of a user document, including timestamps.

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}
// Defines validation rules and database behavior for users.
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    // Automatically manages createdAt and updatedAt fields.
    timestamps: true,
    versionKey: false,
  },
);

// Creates the User model used by the application.
const User = model<IUser>("User", userSchema);

export default User;
