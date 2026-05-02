import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import bcrypt from "bcryptjs";

export const getMyProfile = async (req, res) => {
  res.json(req.user);
};

export const updateProfile = async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (email) user.email = email;

  await user.save();

  res.json({ msg: "Profile updated", user });
};

export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const match = await bcrypt.compare(currentPassword, user.password);

  if (!match)
    return res.status(400).json({ msg: "Incorrect current password" });

  user.password = newPassword;
  await user.save();

  res.json({ msg: "Password updated" });
};

export const uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

  const upload = await cloudinary.uploader.upload(req.file.path, {
    folder: "avatars",
  });

  const user = await User.findById(req.user._id);
  user.avatar = upload.secure_url;
  await user.save();

  res.json({ avatar: user.avatar });
};
