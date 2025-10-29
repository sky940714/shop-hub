// backend/utils/generateToken.js
const jwt = require('jsonwebtoken');

/**
 * 生成 JWT Token
 * @param {number} userId - 會員 ID
 * @returns {string} JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = generateToken;