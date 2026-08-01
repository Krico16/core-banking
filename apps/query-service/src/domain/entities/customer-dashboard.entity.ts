export class CustomerDashboard {
  private constructor(
    readonly customerId: string,
    readonly email: string,
    readonly firstName: string,
    readonly lastName: string,
    readonly country: string,
    readonly accountCount: number,
    readonly updatedAt: Date,
  ) {}

  static create(props: {
    customerId: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
  }): CustomerDashboard {
    return new CustomerDashboard(
      props.customerId,
      props.email,
      props.firstName,
      props.lastName,
      props.country,
      0,
      new Date(),
    );
  }

  static reconstruct(props: {
    customerId: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    accountCount: number;
    updatedAt: Date;
  }): CustomerDashboard {
    return new CustomerDashboard(
      props.customerId,
      props.email,
      props.firstName,
      props.lastName,
      props.country,
      props.accountCount,
      props.updatedAt,
    );
  }

  incrementAccountCount(): CustomerDashboard {
    return new CustomerDashboard(
      this.customerId,
      this.email,
      this.firstName,
      this.lastName,
      this.country,
      this.accountCount + 1,
      new Date(),
    );
  }
}
