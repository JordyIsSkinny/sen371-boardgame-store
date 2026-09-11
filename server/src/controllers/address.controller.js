import * as addressService from "../services/address.service.js";

export async function createAddress(req, res, next) {
  try {
    const { line1, line2, city, provinceState, postalCode, country, isDefault } = req.body;
    const address = await addressService.createAddress(req.user.id, {
      line1,
      line2,
      city,
      provinceState,
      postalCode,
      country,
      isDefault,
    });
    res.status(201).json({ data: address });
  } catch (err) {
    next(err);
  }
}

export async function getAddresses(req, res, next) {
  try {
    const addresses = await addressService.getAddressesByUser(req.user.id);
    res.json({ data: addresses });
  } catch (err) {
    next(err);
  }
}
