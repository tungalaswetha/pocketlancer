import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "video", "website"],
      required: true,
    },
    title: String,
    description: String,
    url: String,
    publicId: String,
  },
  { timestamps: true },
);

const PortfolioItem = mongoose.model("PortfolioItem", portfolioSchema);

export default PortfolioItem;
