import { CustomerDashboard } from '../../../domain/entities/customer-dashboard.entity';
import { CustomerDashboardOrmEntity } from '../entities/customer-dashboard.orm-entity';

export class CustomerDashboardMapper {
  static toPersistence(dashboard: CustomerDashboard): CustomerDashboardOrmEntity {
    const orm = new CustomerDashboardOrmEntity();
    orm.customerId = dashboard.customerId;
    orm.email = dashboard.email;
    orm.firstName = dashboard.firstName;
    orm.lastName = dashboard.lastName;
    orm.country = dashboard.country;
    orm.accountCount = dashboard.accountCount;
    orm.updatedAt = dashboard.updatedAt;
    return orm;
  }

  static toDomain(orm: CustomerDashboardOrmEntity): CustomerDashboard {
    return CustomerDashboard.reconstruct({
      customerId: orm.customerId,
      email: orm.email,
      firstName: orm.firstName,
      lastName: orm.lastName,
      country: orm.country,
      accountCount: orm.accountCount,
      updatedAt: orm.updatedAt,
    });
  }
}
