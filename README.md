# erc20-mass-sender

## Summary
erc20-mass-sender reads a CSV file and sends tokens from the user's wallets to the accounts specified in the file.

## Installation
### In terminal:
**NodeJS must be installed**
```
$ npm install
```
### Modify the config.js file:
**OR**
Modify your own config.js file.

### Config File

erc20-mass-sender can be configured using command line arguments, or it can read a config file.  The config file is specified using the --config command.  By default ./config.js is read, but you can create your own configuration file following the ./config.js template.  If an option is set in the config file, as well as directly on the command line, the command line argument takes precedence.

## Running
Running **node index -h** in the src folder will produce usage information
```
$ node index -h
usage: index [-h] [-v] [--config path] [--wallet path] [--csv path]
             [--contractAddress address] [--tokenDecimal num] [--offset num]
             [--batch num] [--gasPrice num] [--gasLimit num]
             

ERC20 Mass Sender

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  --config path         Specify configuration file (default: ../config.js)
  --wallet path         Specify a ethereum wallet file.
  --csv path            Specify a CSV file with Ethereum addresses and 
                        amounts.
  --contractAddress address
                        Specify a sending ERC20 contract address
  --tokenDecimal num    Specify the amount of ERC20 token decimals
  --offset num          Specify a sending offset for the CSV file (default: 0)
  --batch num           Specify a batch size or how many transactions to send 
                        (default: to the end of CSV file)
  --gasPrice num        Specify gas price (wei)
  --gasLimit num        Specify gas limit (wei)
```
First, specify your configuration file or enter details manaually.  **You can enter in multiple arguments at once.**  You will need to enter in the path to your ethereum wallet file, the path to your CSV file which contains sending information and your wallet address to successfully run the program.  You may also specify a token decimal, an offset start position and batch size.

Your CSV file will contain addresses and the amounts you want to send.  It must be structured as shown:
```
address,amount
address,amount
...
address,amount
```
For example, the following lists two addresses and the corresponding amount of tokens to send to each address.  In this case, 0 tokens will be sent to both addresses.
```
0x059345dE4c56C80A5d90AD3B170627e2a7339173,0
0x3e390fD69D0D306D5fdd1dF6F266B8e742460cdb,0
```
When you have all the data inputed, or at least the necessary requriements, you will be prompted to run the transaction.  Type y or n to proceed with the transaction.

