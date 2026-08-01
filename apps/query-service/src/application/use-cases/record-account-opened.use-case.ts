import { Inject, Injectable, Logger } from '@nestjs/common';
import { AccountView } from '../../domain/entities/account-view.entity';
import {
  AccountViewRepository,
  ACCOUNT_VIEW_REPOSITORY,
} from '../../domain/ports/account-view-repository.port';
import {
  CustomerDashboardRepository,
  CUSTOMER_DASHBOARD_REPOSITORY,
} from '../../domain/ports/customer-dashboard-repository.port';
import { RecordAccountOpenedInput } from '../dto/record-account-opened.input';

@Injectable()
export class RecordAccountOpenedUseCase {
  private readonly logger = new Logger(RecordAccountOpenedUseCase.name);

  constructor(
    @Inject(ACCOUNT_VIEW_REPOSITORY) private readonly accountViewRepo: AccountViewRepository,
    @Inject(CUSTOMER_DASHBOARD_REPOSITORY)
    private readonly dashboardRepo: CustomerDashboardRepository,
  ) {}

  async execute(input: RecordAccountOpenedInput): Promise<void> {
    const existing = await this.accountViewRepo.findById(input.accountId);
    if (existing) return;

    const view = AccountView.create({
      accountId: input.accountId,
      customerId: input.customerId,
      accountNumber: input.accountNumber,
      accountType: input.accountType,
      currency: input.currency,
    });
    await this.accountViewRepo.save(view);

    // CustomerRegistered y AccountOpened vienen de topics distintos — el orden de
    // entrega entre ellos no está garantizado. Si el dashboard aún no existe, se
    // omite el incremento en vez de fallar (límite conocido, ver docs/architecture).
    const dashboard = await this.dashboardRepo.findById(input.customerId);
    if (!dashboard) {
      this.logger.warn(
        `CustomerDashboard for ${input.customerId} not found yet; account count for ${input.accountId} not reflected`,
      );
      return;
    }
    await this.dashboardRepo.save(dashboard.incrementAccountCount());
  }
}
