import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async createCheckout(@Body('amount') amount: number) {
    return this.checkoutService.createPreference(amount);
  }
}
