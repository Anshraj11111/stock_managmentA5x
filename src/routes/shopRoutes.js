// import express from "express";
// import authMiddleware from "../middlewares/authmiddleware.js";
// import shopMiddleware from "../middlewares/shopmiddleware.js";
// import allowRoles from "../middlewares/rolemiddleware.js";
// import {
//   getShopDetails,
//   updateShopDetails,
// } from "../controllers/shopcontroller.js";

// const router = express.Router();

// // 🔐 OWNER ONLY
// router.use(authMiddleware);
// router.use(shopMiddleware);
// router.use(allowRoles("owner"));

// router.get("/", getShopDetails);
// router.put("/", updateShopDetails);

// export default router;
import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";
import allowRoles from "../middlewares/rolemiddleware.js";
import {
  getShopDetails,
  updateShopDetails,
} from "../controllers/shopcontroller.js";

const router = express.Router();

// ✅ Common middlewares (Owner + Staff)
router.use(authMiddleware);
router.use(shopMiddleware);

// ✅ GET → Owner + Staff dono
router.get("/", getShopDetails);
////////
// ❌ PUT → Sirf Owner
router.put("/", allowRoles("owner"), updateShopDetails);

export default router;
