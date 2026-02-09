import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

export const getUsers = asyncHandler(async (req, res) => {

  const users = await User.find();

  if (!users) {
    throw new ApiError(404, "Users not found");
  }

  return res.status(200).json(
    new ApiResponse(true, users, "Users fetched successfully")
  );

});
