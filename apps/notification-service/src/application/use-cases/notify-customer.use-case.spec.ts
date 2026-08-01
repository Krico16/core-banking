import { Test, TestingModule } from '@nestjs/testing';
import { NotifyCustomerUseCase } from './notify-customer.use-case';
import { NOTIFICATION_REPOSITORY } from '../../domain/ports/notification-repository.port';
import { NOTIFICATION_SENDER } from '../../domain/ports/notification-sender.port';
import { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';

const mockRepo = { save: jest.fn(), findBySubjectId: jest.fn() };
const mockSender = { send: jest.fn() };

describe('NotifyCustomerUseCase', () => {
  let useCase: NotifyCustomerUseCase;

  beforeEach(async () => {
    [mockRepo.save, mockRepo.findBySubjectId, mockSender.send].forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyCustomerUseCase,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockRepo },
        { provide: NOTIFICATION_SENDER, useValue: mockSender },
      ],
    }).compile();
    useCase = module.get(NotifyCustomerUseCase);
  });

  it('creates, sends, and persists a LOG notification', async () => {
    const result = await useCase.execute({
      subjectId: 'cust_1',
      eventType: 'CustomerSuspended',
      message: 'Your account access has been suspended: FRAUD',
    });

    expect(result.channel).toBe(NotificationChannel.LOG);
    expect(result.subjectId).toBe('cust_1');
    expect(mockSender.send).toHaveBeenCalledWith(result);
    expect(mockRepo.save).toHaveBeenCalledWith(result);
  });

  it('sends before persisting', async () => {
    const callOrder: string[] = [];
    mockSender.send.mockImplementation(async () => {
      callOrder.push('send');
    });
    mockRepo.save.mockImplementation(async () => {
      callOrder.push('save');
    });

    await useCase.execute({ subjectId: 'cust_1', eventType: 'CustomerSuspended', message: 'x' });

    expect(callOrder).toEqual(['send', 'save']);
  });
});
