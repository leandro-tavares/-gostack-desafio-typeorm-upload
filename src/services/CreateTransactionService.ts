import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface RequestTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

interface ResponseTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_id: string;
}

class CreateTransactionService {
  public async getCategoryId(category: string): Promise<string> {
    const categoriesRepository = getRepository(Category);
    const checkCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    let category_id: string;
    if (!checkCategory) {
      category_id = await categoriesRepository
        .save({
          title: category,
        })
        .then(item => item.id);
    } else {
      category_id = checkCategory.id;
    }

    return category_id;
  }

  public async insert({
    title,
    value,
    type,
    category_id,
  }: ResponseTransaction): Promise<Transaction> {
    const transactionsRepository = getRepository(Transaction);
    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }

  public async execute({
    title,
    value,
    type,
    category,
  }: RequestTransaction): Promise<Transaction> {
    const balanceRepository = getCustomRepository(TransactionsRepository);

    const { total } = await balanceRepository.getBalance();
    if (type === 'outcome' && total < value) {
      throw new AppError(
        "You don't have money enough to complete this transaction",
      );
    }

    const category_id = await this.getCategoryId(category);
    const transaction = await this.insert({ title, value, type, category_id });

    return transaction;
  }
}

export default CreateTransactionService;
