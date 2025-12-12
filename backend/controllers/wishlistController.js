// backend/controllers/wishlistController.js
const Wishlist = require('../models/Wishlist');

exports.getWishlist = async (req, res) => {
  try {
    // req.user.id 來自你的 authMiddleware
    const items = await Wishlist.getByUserId(req.user.id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '獲取收藏清單失敗' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    await Wishlist.add(req.user.id, productId);
    res.json({ success: true, message: '已加入收藏' });
  } catch (error) {
    res.status(500).json({ success: false, message: '加入失敗' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    await Wishlist.remove(req.user.id, productId);
    res.json({ success: true, message: '已移除收藏' });
  } catch (error) {
    res.status(500).json({ success: false, message: '移除失敗' });
  }
};