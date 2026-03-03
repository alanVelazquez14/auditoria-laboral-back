import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';

@Injectable()
export class CheckoutService {
  private client: MercadoPagoConfig;

  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN ?? '',
    });
  }

  async createPreference(amount: number) {
    try {
      const preference = await new Preference(this.client).create({
        body: {
          items: [
            {
              id: 'donacion',
              title: 'Soporte a la plataforma',
              quantity: 1,
              unit_price: Number(amount),
              currency_id: 'ARS',
            },
          ],
          back_urls: {
            success: 'http://localhost:3000/support/success',
            failure: 'http://localhost:3000/support/error',
            pending: 'http://localhost:3000/support/pending',
          },
        //   auto_return: 'approved',
        },
      });
      return { url: preference.init_point };
    } catch (error) {
      console.error('Error detallado de MP:', error);
      throw error;
    }
  }
}
