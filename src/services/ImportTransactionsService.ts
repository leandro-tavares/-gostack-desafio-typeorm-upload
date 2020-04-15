/* eslint-disable no-cond-assign */
/* eslint-disable new-cap */
import { getRepository, getCustomRepository } from 'typeorm';

import path from 'path';
import readlines from 'n-readlines';

import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import CreateTransactionService from './CreateTransactionService';

import AppError from '../errors/AppError';

interface Request {
  importFile: string;
}

interface Response {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ importFile }: Request): Promise<Transaction[]> {
    const importFilePath = path.join(uploadConfig.directory, importFile);

    const data = new readlines(importFilePath);

    let line;
    let lineNumber = 0;
    const transactions = [];

    while ((line = data.next())) {
      if (lineNumber > 0) {
        const item = line.toString('ascii').split(',');
        const title = item[0].trim();
        const type = item[1].trim();
        const value = parseFloat(item[2]);
        const category = item[3].trim();

        const transaction = {
          title,
          type,
          value,
          category,
        };

        transactions.push(transaction);
      }
      lineNumber += 1;
    }

    const income = transactions
      .map(item => (item.type === 'income' ? item.value : 0))
      .reduce((total, val) => total + val);

    const outcome = transactions
      .map(item => (item.type === 'outcome' ? item.value : 0))
      .reduce((total, val) => total + val);

    const totalImport = income - outcome;

    const balanceRepository = getCustomRepository(TransactionsRepository);
    const { total } = await balanceRepository.getBalance();

    if (totalImport + total < 0) {
      throw new AppError(
        "You don't have money enough, to complete this import.",
      );
    }

    const createTransaction = new CreateTransactionService();

    const result = transactions.map(async item => {
      const transaction = {
        title: item.title,
        value: item.value,
        type: item.type as 'income' | 'outcome',
        category_id: await createTransaction.getCategoryId(item.category),
      };
      const imported = await createTransaction.insert(transaction);
      return imported;
    });

    return Promise.all(result);
  }
}

export default ImportTransactionsService;
