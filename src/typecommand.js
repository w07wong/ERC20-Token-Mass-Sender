'use strict';
var ArgumentParser = require('argparse').ArgumentParser;
var fs = require('fs');
var ini = require('ini');
var _ = require('lodash');
var pjson = require('../package.json');
var fastCSV = require('fast-csv');
var Web3 = require('web3');
var configFile = require('../config.js');
var Tx = require('ethereumjs-tx');
var prompt = require('prompt');

//web3 implementation
var web3 = new Web3();
var eth = web3.eth;
var eToken = web3.eth.contract(configFile.abi).at(configFile.address);
web3.setProvider(new web3.providers.HttpProvider(configFile.gethNode));

const TEST_VERSION = pjson.version;

//vars for csv
let _csvAddresses = [];
let _csvAmounts = [];

let privateKey;
let gasPrice;
let gasLimit;
let nonce;
let offset;
let batchSize;
let tokenDecimal;
let tokenMultiplier;

class TypeCommand {
    constructor() {}

    getArgs(args) {

        let parser = new ArgumentParser({
            version: TEST_VERSION,
            addHelp: true,
            description: 'Test'
        });

        //configuration
        parser.addArgument(
          ['--config'], {
                help: 'Specify configuration file (default: ../resources/config.conf)',
                metavar: 'path',
            }
        );

        //wallet
        parser.addArgument(
          ['--wallet'], {
                help: 'Specify file with MyEtherWallet encrypted JSON container',
                metavar: 'path',
            }
        );

        //csv
        parser.addArgument(
          ['--csv'], {
                help: 'Specify CSV file with Ethereum addresses and amounts. CSV must be formatted like so: "address,amount,address,amount" which each amount corresponding to the preceeding address.',
                metavar: 'path',
            }
        );

        //contract address
        parser.addArgument(
          ['--address'], {
                help: 'Specify ERC20 contract address',
                metavar: 'address',
            }
        );

        //token decimals
        parser.addArgument(
          ['--decimal'], {
                help: 'Specify ERC20 token decimals',
                metavar: 'num',
            }
        );

        //offset
        parser.addArgument(
          ['--offsset'], {
                help: 'Specify offset in CSV file, to start sendings from (default: 0)',
                metavar: 'num',
            }
        );

        //batch size
        parser.addArgument(
          ['--batch'], {
                help: 'Specify batch size (how many transactions to send, default: to the end of CSV file)',
                metavar: 'num',
            }
        );

        //gas price
        parser.addArgument(
          ['--gasPrice'], {
                help: 'Specify gas price (wei)',
                metavar: 'num',
            }
        );

        //gas limit
        parser.addArgument(
          ['--gasLimit'], {
                help: 'Specify gas limit (wei)',
                metavar: 'num',
            }
        );

        //ready to run transaction?
        parser.addArgument(
          ['--ready'], {
                help: 'Set to true if ready to begin sending: "--ready true"',
                metavar: 'string',
            }
        );

        return parser.parseArgs(args);
    }

    getConfig(configFile) {
        let iniData;
        try {
            iniData = fs.readFileSync(configFile || '../resources/config.conf', 'utf-8');
        } catch (err) {
            //Only throw on failure to read if configuration file was expilicitly specified
            if (configFile) {
                throw new Error("Could not read config file " + configFile);
            }
        }
        return iniData ? ini.parse(iniData) : {};
    }

    //Gets user wallet's address
    getWalletAddr(pathName) {
        let walletJSON;
        try {
            walletJSON = fs.readFileSync(pathName);
        } catch (err) {
            throw new Error('Could not read wallet file' + pathName);
        }
        return JSON.parse(walletJSON).address;
    }

    getWalletBalance(wallAddr) {
        var balance = web3.eth.getBalance(wallAddr);
        return balance.toNumber();
    }

    enactTransaction(addresses, amounts) {

        prompt.start();

        prompt.get({
            name: 'wallet_private_key',
            hidden: true,
            conform: function (value) {
                return true;
            }
        }, function (err, result) {
            //save inputs
            privateKey = new Buffer(result.wallet_private_key.toString(), 'hex');
            console.log('Your private key will be deleted once transaction finishes.');

            let transactionCount = 0;
            nonce = web3.eth.getTransactionCount(web3.eth.defaultAccount);

            batchSize === '' ? batchSize = addresses.length : batchSize = batchSize;

            for (var i = offset; i < addresses.length; i++) {
                if (transactionCount < batchSize) {

                    //nonce
                    nonce++;
                    var nonceHex = web3.toHex(nonce);

                    //recipient address
                    var toAddressHex = web3.toHex(addresses[i]);

                    //amount to send
                    var valueAmount = amounts[i] * tokenMultiplier;
                    var valueAmountHex = web3.toHex(valueAmount);

                    //transaction object
                    var rawTx = {
                        nonce: nonceHex,
                        gasPrice: gasPrice,
                        gasLimit: gasLimit,
                        to: toAddressHex,
                        from: web3.eth.defaultAccount,
                        value: valueAmountHex,
                        data: ''
                    }

                    var tx = new Tx(rawTx);
                    tx.sign(privateKey);

                    var serializedTx = tx.serialize();

                    //send
                    web3.eth.sendRawTransaction(`0x${serializedTx.toString('hex')}`, function (err, hash) {
                        if (err)
                            console.log(err);
                        else
                            console.log(hash);
                    });

                    transactionCount++;

                } else {
                    i == addresses.length;
                    console.log('Transactions sent.');
                }
            }

            //delete private key
            privateKey = '';

        });
    };

    run(argString) {

        //defaults that get overriden by command line entries
        let defaults = {
            wallet: '../resources/sampleWallet',
            csv: '../resources/default.csv',
            address: '',
            decimal: '0',
            offset: '0',
            batch: '',
            gasPrice: '',
            gasLimit: '',
            ready: 'false',
            config: '../resources/config.conf'
        };

        //Parse command line args
        let args = this.getArgs(argString && argString.split(' '));

        //Get config file (depends on command line arg --conf)
        let parsedConfig = this.getConfig(args.config);

        //Config file overrides default options listed in this method
        _.assign(defaults, parsedConfig);

        //Command line args override config file args - keys creates an array of the input
        _.keys(args).forEach(k => {
            //parseArgs sets missing values to null
            if (args[k] !== null) {
                defaults[k] = args[k];
            }
        });

        defaults.address = this.getWalletAddr(defaults.wallet.toString());

        fs.writeFileSync('../resources/config.conf', ini.stringify(defaults, {}))

        //Reads CSV, stores variables
        fastCSV
            .fromPath(defaults.csv, {
                ignoreEmpty: true
            })
            .on('data', function (data) {
                _csvAddresses.push(data[0]);
                _csvAmounts.push(data[1]);
            });

        //sets the default account (sender account)
        web3.eth.defaultAccount = `0x${defaults.address}`;

        //sets the offset
        offset = defaults.offset;

        //sets the batch size
        batchSize = defaults.batch;

        //sets the gas price
        gasPrice = web3.toHex(defaults.gasPrice);

        //sets the gas limit
        gasLimit = web3.toHex(defaults.gasLimit);

        //sets the token decimal & multiplier to send fractional amounts
        tokenDecimal = defaults.decimal;
        tokenMultiplier = Math.pow(10, tokenDecimal * (-1));

        //if the user is ready, set a arg to true, then run transaction method
        if (defaults.ready.toString().toLowerCase() === 'true') {
            this.enactTransaction(_csvAddresses, _csvAmounts);
            //get user password, sendTransaction(using gas prices, limit, nonce, addresses);
        }
    }
}

module.exports = TypeCommand;
