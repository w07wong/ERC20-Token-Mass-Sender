# erc20-mass-sender

## Summary
erc20-mass-sender reads a CSV file and sends tokens from the user's wallets to the accounts specified in the file.

## Installation
### In terminal:
NodeJS must be installed first.
```
$ npm install
```

Modify config.js file to set parameters.

### Config File

erc20-mass-sender can be configured using command line arguments, or it can read a config file.  The config file is specified using the --config command.  By default ./config.js is read, but you can create your own configuration file following the ./config.js template.  If an option is set in the config file, as well as directly on the command line, the command line argument takes precedence.

## Running
Running **node index -h** in the src folder will produce usage information:
```
$ node index -h
usage: index [-h] [-v] [--config path] [--wallet path] [--csv path]
             [--contractAddress address] [--tokenDecimal num] [--offset num]
             [--batch num] [--gasPrice num] [--gasLimit num]


ERC20 Mass Sender

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  --config path         Specify configuration file (default: ../config.js).
  --wallet path         Specify a MyEtherWallet wallet file
  --csv path            Specify a CSV file with Ethereum addresses and
                        amounts.
  --contractAddress address
                        Specify a ERC20 contract address of the token.
  --tokenDecimal num    Specify the amount of ERC20 token decimals.
  --offset num          Specify a sending offset for the CSV file (default: 0).
  --batch num           Specify a batch size or how many transactions to send
                        (default: to the end of CSV file).
  --gasPrice num        Specify gas price (wei).
  --gasLimit num        Specify gas limit (wei).
```
First, specify your configuration file or enter parameters as command line arguments. Required parameters: the path to your MyEtherWallet wallet file, the path to your CSV file, ERC20 token address to send. You may also specify a token decimal, an offset start position and batch size.

Your CSV file should contain Ethereum addresses and the token amounts you want to send.  It must be structured as shown:
```
address,amount
address,amount
...
address,amount
```
For example, the following lists two addresses and the corresponding amount of tokens to send to each address:
```
0x059345dE4c56C80A5d90AD3B170627e2a7339173,1234
0x3e390fD69D0D306D5fdd1dF6F266B8e742460cdb,14.202051
```

After running the script with correct parameters you will be prompted to execute the transactions. Type "y" to proceed, "n" to cancel.
