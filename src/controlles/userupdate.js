import User from "../models/usermodel.js";

// Controller to update all account dossier data in MongoDB
export const updateUser = async (req, res) => {
  try {
    const { id, email, name, phone, address, city, country, postalCode, tier } = req.body;

    if (!id && !email) {
      return res.status(400).json({
        success: false,
        message: "Client identifier (id or email) is required to update account data",
      });
    }

    let query = {};
    if (id) {
      query._id = id;
    } else {
      query.email = email.toLowerCase().trim();
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (address !== undefined) updateFields.address = address.trim();
    if (city !== undefined) updateFields.city = city.trim();
    if (country !== undefined) updateFields.country = country.trim();
    if (postalCode !== undefined) updateFields.postalCode = postalCode.trim();
    if (tier !== undefined) updateFields.tier = tier;

    const updatedUser = await User.findOneAndUpdate(
      query,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Client dossier not found in database",
      });
    }

    console.log(`[USER UPDATED IN DB] ${updatedUser.name} (${updatedUser.email})`);

    return res.json({
      success: true,
      message: "Client account dossier successfully updated in backend database",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        address: updatedUser.address || "",
        city: updatedUser.city || "",
        country: updatedUser.country || "",
        postalCode: updatedUser.postalCode || "",
        tier: updatedUser.tier,
        serialId: updatedUser.serialId,
        isadmin: updatedUser.isadmin,
        memberSince: new Date(updatedUser.createdAt).getFullYear().toString(),
      },
    });
  } catch (error) {
    console.error("Error in updateUser controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update account data in database",
      error: error.message,
    });
  }
};

export default updateUser;
