import * as addressRepository from '../repositories/address.repository.js';

export async function createAddress(userId, data) {
  return addressRepository.createAddress({ ...data, userId });
}

export async function getAddressesByUser(userId) {
  return addressRepository.getAddressesByUser(userId);
}
