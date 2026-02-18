// import Razorpay from "razorpay";
// import crypto from "crypto";
// import shop from "../models/shopmodel.js";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // ✅ CREATE ORDER
// export const createOrder = async (req, res) => {
//   try {
//     const { plan } = req.body;

//     let amount;

//     if (plan === "monthly") amount = 19900;
//     else if (plan === "6month") amount = 99900;
//     else if (plan === "yearly") amount = 179900;
//     else return res.status(400).json({ message: "Invalid plan" });

//     const options = {
//       amount,
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     };

//     const order = await razorpay.orders.create(options);

//     res.json(order);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // ✅ VERIFY PAYMENT
// export const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       plan,
//     } = req.body;

//     const body = razorpay_order_id + "|" + razorpay_payment_id;

//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body.toString())
//       .digest("hex");

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({ message: "Invalid signature" });
//     }

//     // ✅ ACTIVATE SUBSCRIPTION
//     await shop.update(
//       {
//         subscription_active: true,
//       },
//       { where: { id: req.user.shop_id } }
//     );

//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
export const createOrder = async (req, res) => {
  return res.status(400).json({
    message: "Payments disabled. Trial mode active.",
  });
};

