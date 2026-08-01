import { CustomerOrmEntity } from '../entities/customer.orm-entity';
import { Customer } from '../../../domain/entities/customer.entity';
import {
  CustomerId, Email, KycStatus, CustomerStatus,
} from '../../../domain/value-objects';

export class CustomerMapper {
  static toDomain(orm: CustomerOrmEntity): Customer {
    return Customer.reconstruct({
      id: CustomerId.fromPlain(orm.id),
      userId: orm.userId,
      email: Email.fromPlain(orm.email),
      firstName: orm.firstName,
      lastName: orm.lastName,
      phoneNumber: orm.phoneNumber || '',
      street: orm.street || '',
      city: orm.city || '',
      country: orm.country || '',
      postalCode: orm.postalCode || '',
      kycStatus: KycStatus.fromPlain(orm.kycStatus),
      status: CustomerStatus.fromPlain(orm.status),
      riskLevel: orm.riskLevel || 'LOW',
      version: orm.version,
    });
  }

  static toPersistence(domain: Customer): Partial<CustomerOrmEntity> {
    return {
      id: domain.id.value,
      userId: domain.userId,
      email: domain.email.value,
      firstName: domain.firstName,
      lastName: domain.lastName,
      phoneNumber: domain.phoneNumber || undefined,
      street: domain.address.street || undefined,
      city: domain.address.city || undefined,
      country: domain.address.country || undefined,
      postalCode: domain.address.postalCode || undefined,
      status: domain.status.value,
      kycStatus: domain.kycStatus.value,
      riskLevel: domain.riskLevel,
      version: domain.version,
    };
  }
}
