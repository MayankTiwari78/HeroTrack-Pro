module.exports.authmiddleware = async (req, res, next) => {
  try {
    const cookieToken = req.cookies.Inventorymanagmentsystem;

    const headerToken =
      req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null;

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: No token provided.",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodedToken || !decodedToken.userId) {
      return res.status(401).json({
        message: "Unauthorized: Invalid token.",
      });
    }

    const user = await User.findById(decodedToken.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized: User not found.",
      });
    }

    if (!activeRoles.includes(user.role)) {
      return res.status(403).json({
        message: "403 Unauthorized: Role is no longer active.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);

    return res.status(401).json({
      message: "Unauthorized: Invalid or expired token.",
    });
  }
};
