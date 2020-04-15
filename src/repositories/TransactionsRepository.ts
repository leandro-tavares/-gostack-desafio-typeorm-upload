import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

interface Response {
  type: string;
  value: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    let income = 0;
    let outcome = 0;

    if (transactions.length > 0) {
      income = transactions
        .map(item => (item.type === 'income' ? item.value : 0))
        .reduce((total, val) => total + val);

      outcome = transactions
        .map(item => (item.type === 'outcome' ? item.value : 0))
        .reduce((total, val) => total + val);
    }

    const total = income - outcome;

    return { income, outcome, total };
  }
}

export default TransactionsRepository;
