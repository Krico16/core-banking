import { Customer } from '../../domain/entities';

export interface CustomerResponse {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  street: string;
  city: string;
  country: string;
  postalCode: string;
  status: string;
  kycStatus: string;
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toCustomerResponse(customer: Customer): CustomerResponse {
  return {
    id: customer.id.toString(),
    userId: customer.userId,
    email: customer.email.toString(),
    firstName: customer.firstName,
    lastName: customer.lastName,
    phoneNumber: customer.phoneNumber,
    street: customer.address.street,
    city: customer.address.city,
    country: customer.address.country,
    postalCode: customer.address.postalCode,
    status: customer.status.toString(),
    kycStatus: customer.kycStatus.toString(),
    riskLevel: customer.riskLevel,
    createdAt: '',
    updatedAt: '',
    version: customer.version,
  };
}
