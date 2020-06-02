import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('This customer does not exists');
    }

    const stockProducts = await this.productsRepository.findAllById(products);
    if (stockProducts.length === 0) {
      throw new AppError('This products are invalid');
    }

    const orderProducts = products.map((product, i) => {
      if (product.quantity > stockProducts[i].quantity) {
        throw new AppError(`No sufficient quantity for product ${product.id}`);
      }

      stockProducts[i].quantity -= product.quantity;

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: stockProducts[i].price,
      };
    });

    await this.productsRepository.updateQuantity(stockProducts);

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
