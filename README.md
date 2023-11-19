# bank-transactions-summarizer
Groups bank transactions by categories and shows them nicely

![ui.png](ui.png)

## How to run

```sh
cd source
npm install
make run
```

## How to add application data

... that is, bank transactions and categories.

```sh
mkdir /tmp/csvdata_g304g9m # or any other dir
cp categories.json /tmp/csvdata_g304g9m
cp my_bank_transactions.csv /tmp/csvdata_g304g9m

export DATA_DIR=/tmp/csvdata_g304g9m
make run
```
