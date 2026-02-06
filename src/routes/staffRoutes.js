import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import allowRoles from "../middlewares/rolemiddleware.js";
import {
  addStaff,
  getAllStaff,
  updateStaff,
  deleteStaff,
  deactivateStaff,
  activateStaff,
} from "../controllers/staffcontroller.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";

const router = express.Router();

// 🔐 OWNER ONLY
router.use(authMiddleware);
router.use(shopMiddleware);
router.use(allowRoles("owner"));

router.post("/", addStaff);
router.get("/", getAllStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);

// ✅ IMPORTANT ROUTES
router.patch("/:id/deactivate", deactivateStaff);
router.patch("/:id/activate", activateStaff);

export default router;
